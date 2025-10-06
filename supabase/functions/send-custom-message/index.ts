import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) throw userError;

    const { data: adminProfile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied: User is not an admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { recipientType, specificRecipientId, messageContent, channel } = await req.json();

    if (!messageContent || !channel || !recipientType) {
      return new Response(JSON.stringify({ error: 'Missing messageContent, channel, or recipientType.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let recipients: { full_name: string; phone: string; type: 'profile' | 'guest' }[] = [];

    if (recipientType === 'all_players' || recipientType === 'all_mensalistas' || recipientType === 'all_diaristas') {
      let query = supabaseAdmin
        .from('profiles')
        .select('full_name, phone, is_mensalista, payment_status')
        .eq('is_deleted', false)
        .eq('is_suspended', false);

      if (recipientType === 'all_mensalistas') {
        query = query.eq('is_mensalista', true);
      } else if (recipientType === 'all_diaristas') {
        query = query.eq('is_mensalista', false);
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;
      recipients = (profiles || [])
        .filter(p => p.phone)
        .map(p => ({ full_name: p.full_name || 'Jogador', phone: p.phone!, type: 'profile' }));

    } else if (recipientType === 'specific_player' && specificRecipientId) {
      const playerId = specificRecipientId.replace('profile-', '');
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', playerId)
        .eq('is_deleted', false)
        .eq('is_suspended', false)
        .single();
      if (profileError) throw profileError;
      if (profile?.phone) {
        recipients.push({ full_name: profile.full_name || 'Jogador', phone: profile.phone, type: 'profile' });
      }
    } else if (recipientType === 'specific_guest' && specificRecipientId) {
      const guestId = parseInt(specificRecipientId.replace('guest-', ''), 10);
      const { data: guest, error: guestError } = await supabaseAdmin
        .from('guest_players')
        .select('full_name, phone')
        .eq('id', guestId)
        .eq('is_deleted', false)
        .eq('is_suspended', false)
        .single();
      if (guestError) throw guestError;
      if (guest?.phone) {
        recipients.push({ full_name: guest.full_name || 'Convidado', phone: guest.phone, type: 'guest' });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid recipient type or missing specificRecipientId.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messagesSent: string[] = [];
    for (const recipient of recipients) {
      // Call the generic send-message function
      const { error: sendError } = await supabaseAdmin.functions.invoke('send-message', {
        body: { to: recipient.phone, message: messageContent, channel },
      });
      if (sendError) console.error(`Failed to send message to ${recipient.full_name}:`, sendError);
      else messagesSent.push(`Message sent to ${recipient.full_name}`);
    }

    return new Response(JSON.stringify({ success: true, messagesSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-custom-message Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});