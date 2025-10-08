"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Users, MessageCircle, CheckCircle } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showError, showSuccess } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

interface Game {
  id: number;
  game_date: string;
  max_players: number;
  notes: string | null;
  arenas: {
    name: string;
  } | null;
  games_players: { player_id: string }[];
  games_guest_players: [{ count: number }];
}

const Babas = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);
  const { isAdmin, profile, gameTermSingular, gameTermPlural } = useAuth();

  const fetchGames = useCallback(async () => {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id,
        game_date,
        max_players,
        notes,
        arenas ( name ),
        games_players ( player_id ),
        games_guest_players ( count )
      `)
      .order('game_date', { ascending: false }); // Order descending to show newest first

    if (error) {
      console.error("Error fetching games:", error);
      showError(`Erro ao buscar os ${gameTermPlural.toLowerCase()}.`);
    } else if (data) {
      setGames(data as Game[]);
    }
  }, [gameTermPlural]);

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      await fetchGames();
      setInitialLoading(false);
    };
    loadInitialData();
  }, [fetchGames]);

  const handlePresenceToggle = async (game: Game, isConfirmed: boolean) => {
    if (!profile) {
      showError("Você precisa estar logado para realizar esta ação.");
      return;
    }

    const totalPlayers = game.games_players.length + (game.games_guest_players[0]?.count || 0);
    const isGameFull = totalPlayers >= game.max_players;

    if (!isConfirmed && isGameFull) {
      showError(`O ${gameTermSingular.toLowerCase()} já está lotado.`);
      return;
    }
    if (!isConfirmed && profile.is_suspended) {
      showError("Você está suspenso e não pode confirmar presença.");
      return;
    }

    setLoadingGameId(game.id);

    if (isConfirmed) {
      const { error } = await supabase
        .from("games_players")
        .delete()
        .match({ game_id: game.id, player_id: profile.id });

      if (error) {
        showError(error.message);
      } else {
        showSuccess("Presença cancelada.");
        await fetchGames();
      }
    } else {
      const { error } = await supabase.from("games_players").insert({
        game_id: game.id,
        player_id: profile.id,
      });

      if (error) {
        showError(error.message);
      } else {
        showSuccess("Presença confirmada!");
        await fetchGames();
      }
    }
    setLoadingGameId(null);
  };

  const now = new Date();
  const upcomingGames = games.filter(game => new Date(game.game_date) >= now).sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
  const finishedGames = games.filter(game => new Date(game.game_date) < now);

  if (initialLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Próximos {gameTermPlural}</h1>
        {isAdmin && (
          <Button asChild>
            <Link to="/admin/baba/novo">Agendar Novo {gameTermSingular}</Link>
          </Button>
        )}
      </div>

      {upcomingGames.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg">
          <p className="text-muted-foreground">Nenhum {gameTermSingular.toLowerCase()} agendado no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingGames.map((game) => {
            const totalPlayers = game.games_players.length + (game.games_guest_players[0]?.count || 0);
            const gameDate = new Date(game.game_date);
            const isConfirmed = profile ? game.games_players.some(p => p.player_id === profile.id) : false;
            const isGameFull = totalPlayers >= game.max_players;

            return (
              <Card key={game.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-primary capitalize">
                    {`${gameTermSingular} de ${format(gameDate, "eeee, dd/MM", { locale: ptBR })}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span>{format(gameDate, "HH:mm'h'", { locale: ptBR })}</span></div>
                  <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{game.arenas?.name || 'Arena a definir'}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" /><span>{totalPlayers} / {game.max_players} jogadores</span></div>
                  {game.notes && (<div className="flex items-start gap-2 text-sm"><MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5" /><span className="text-muted-foreground">{game.notes}</span></div>)}
                </CardContent>
                <CardFooter className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  {isConfirmed ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="w-full" disabled={loadingGameId === game.id}>{loadingGameId === game.id ? 'Cancelando...' : 'Cancelar Presença'}</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação irá remover sua presença deste {gameTermSingular.toLowerCase()}. Você poderá se inscrever novamente se houver vagas disponíveis.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => handlePresenceToggle(game, true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Cancelamento</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button variant="default" size="sm" className="w-full" onClick={() => handlePresenceToggle(game, false)} disabled={loadingGameId === game.id || isGameFull}>{loadingGameId === game.id ? 'Confirmando...' : 'Confirmar Presença'}</Button>
                  )}
                  <Button asChild variant="secondary" size="sm" className="w-full"><Link to={`/baba/${game.id}`}>{isAdmin ? `Gerenciar ${gameTermSingular}` : `Detalhes do ${gameTermSingular}`}</Link></Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {finishedGames.length > 0 && (
        <div className="mt-12">
          <Separator className="my-8" />
          <h2 className="text-2xl font-bold mb-6">{gameTermPlural} Finalizados</h2>
          <div className="space-y-4">
            {finishedGames.map((game) => {
              const totalPlayers = game.games_players.length + (game.games_guest_players[0]?.count || 0);
              const gameDate = new Date(game.game_date);
              return (
                <Card key={game.id} className="flex items-center justify-between p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <div className="font-medium capitalize">{format(gameDate, "eeee, dd/MM/yy", { locale: ptBR })}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /><span>{game.arenas?.name || 'N/A'}</span></div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /><span>{totalPlayers} jogadores</span></div>
                  </div>
                  <Button asChild variant="outline" size="sm"><Link to={`/baba/${game.id}`}>Ver Detalhes</Link></Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Babas;