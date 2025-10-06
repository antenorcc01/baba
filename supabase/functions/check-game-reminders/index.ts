import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addHours, subHours, isWithinInterval, parseISO, format } from 'https://esm.sh/date-fns@3.6.0';
import { ptBR } from 'https://esm.sh/date-fns@3.6.0/locale';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const twoHoursFromNow = addHours(now, 2);
    const twentyFourHoursFromNow = addHours(now, 24);
    const twentyFourHoursAgo = subHours(now, 24);
    const twoHoursAgo = subHours(now, 2);

    console.log(`Running game reminders check at ${now.toISOString()}`);

    // Fetch games that are within the 24h or 2h window
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('games')
      .select(`
        id,
        game_date,
        max_players,
        notes,
        arenas(name),
        games_players(player_id, profiles(full_name, phone)),
        games_guest_players(guest_player_id, guest_players(full_name, phone))
      `)
      .gte('game_date', twoHoursAgo.toISOString()) // Games that started up to 2 hours ago (to catch 2h reminders)
      .lte('game_date', twentyFourHoursFromNow.toISOString()) // Games up to 24 hours from now
      .eq('status', 'Agendado'); // Only scheduled games

    if (gamesError) throw gamesError;

    const messagesSent: string[] = [];

    for (const game of games) {
      const gameDate = parseISO(game.game_date);
      const formattedGameDate = format(gameDate, "dd/MM 'às' HH:mm", { locale: ptBR });
      const arenaName = game.arenas?.name || 'local a definir';

      const confirmedPlayersMap = new Map<string, { full_name: string; phone: string | null; type: 'profile' | 'guest' }>();
      game.games_players.forEach(gp => {
        if (gp.profiles?.phone) {
          confirmedPlayersMap.set(`profile-${gp.player_id}`, { full_name: gp.profiles.full_name || 'Jogador', phone: gp.profiles.phone, type: 'profile' });
        }
      });
      game.games_guest_players.forEach(ggp => {
        if (ggp.guest_players?.phone) {
          confirmedPlayersMap.set(`guest-${ggp.guest_player_id}`, { full_name: ggp.guest_players.full_name || 'Convidado', phone: ggp.guest_players.phone, type: 'guest' });
        }
      });

      // --- 24h Reminder for UNCONFIRMED players ---
      // Check if game is between 23h and 24h from now
      if (isWithinInterval(gameDate, { start: twentyFourHoursAgo, end: twentyFourHoursFromNow })) {
        console.log(`Checking 24h reminder for game ${game.id}`);

        const { data: allProfiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, phone')
          .eq('is_deleted', false)
          .eq('is_suspended', false);
        if (profilesError) throw profilesError;

        const unconfirmedPlayers = (allProfiles || []).filter(p => 
          p.phone && !confirmedPlayersMap.has(`profile-${p.id}`)
        );

        for (const player of unconfirmedPlayers) {
          const message = `Lembrete: O baba em ${arenaName} no dia ${formattedGameDate} está chegando! Confirme sua presença para garantir sua vaga.`;
          // Call the generic send-message function
          const { error: sendError } = await supabaseAdmin.functions.invoke('send-message', {
            body: { to: player.phone, message, channel: 'whatsapp' }, // Assuming WhatsApp for now
          });
          if (sendError) console.error(`Failed to send 24h reminder to ${player.full_name}:`, sendError);
          else messagesSent.push(`24h reminder to ${player.full_name} for game ${game.id}`);
        }
      }

      // --- 2h Reminder for CONFIRMED players ---
      // Check if game is between 1h and 2h from now
      if (isWithinInterval(gameDate, { start: twoHoursAgo, end: twoHoursFromNow })) {
        console.log(`Checking 2h reminder for game ${game.id}`);
        for (const [key, player] of confirmedPlayersMap.entries()) {
          if (player.phone) {
            const message = `É hoje! O baba em ${arenaName} começa às ${format(gameDate, "HH:mm", { locale: ptBR })}. Não se atrase!`;
            // Call the generic send-message function
            const { error: sendError } = await supabaseAdmin.functions.invoke('send-message', {
              body: { to: player.phone, message, channel: 'whatsapp' }, // Assuming WhatsApp for now
            });
            if (sendError) console.error(`Failed to send 2h reminder to ${player.full_name}:`, sendError);
            else messagesSent.push(`2h reminder to ${player.full_name} for game ${game.id}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, messagesSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-game-reminders Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});