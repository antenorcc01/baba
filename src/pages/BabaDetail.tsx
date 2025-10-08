"use client";

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Edit, ExternalLink, MessageCircle, StarIcon, GoalIcon, PlayIcon, ListIcon, Trash2Icon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import PlayerPresenceManager from "@/components/games/PlayerPresenceManager";
import GuestPresenceManager from "@/components/games/GuestPresenceManager";
import TeamGenerator from "@/components/games/TeamGenerator";
import GameDialog from "@/components/games/GameDialog";
import PresenceButton from "@/components/games/PresenceButton";
import RemovePlayerButton from "@/components/games/RemovePlayerButton";
import RemoveGuestButton from "@/components/games/RemoveGuestButton";
import Scoreboard from "@/components/games/Scoreboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import SelectMatchTeamsDialog from "@/components/games/SelectMatchTeamsDialog";

// Interfaces
interface PlayerProfile {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
  skill_level?: number;
  total_goals?: number;
}

interface GuestPlayer {
  id: number;
  full_name: string;
  skill_level?: number;
  total_goals?: number;
}

interface GamePlayer {
  id: number;
  player_id: string;
  profiles: PlayerProfile;
}

interface GameGuestPlayer {
  id: number;
  guest_player_id: number;
  guest_players: GuestPlayer;
}

interface TeamPlayer {
  id: string;
  full_name: string;
  profile_picture_url?: string;
  skill_level?: number;
  type: 'profile' | 'guest';
}

interface Team {
  name: string;
  players: TeamPlayer[];
}

interface Arena {
  id: number;
  name: string;
  address: string;
}

interface GameMatch {
  id: string;
  game_id: number;
  match_number: number;
  team1_name: string;
  team2_name: string;
  score1: number;
  score2: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  win_condition_goals: number;
  winner_team_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Game {
  id: number;
  game_date: string;
  max_players: number;
  status: 'Agendado' | 'Confirmado' | 'Cancelado' | 'Finalizado';
  notes: string | null;
  generated_teams: Team[] | null;
  arenas: Arena | null;
  games_players: GamePlayer[];
  games_guest_players: GameGuestPlayer[];
  default_match_duration_minutes: number;
  default_match_win_goals: number;
  game_matches: GameMatch[];
}

const fetchGame = async (id: string): Promise<Game> => {
  const { data, error } = await supabase
    .from("games")
    .select(`
        id, game_date, max_players, status, notes, generated_teams,
        arenas ( id, name, address ),
        games_players( id, player_id, profiles(id, full_name, profile_picture_url, skill_level, total_goals) ),
        games_guest_players( id, guest_player_id, guest_players(id, full_name, skill_level, total_goals) ),
        default_match_duration_minutes,
        default_match_win_goals,
        game_matches(*)
    `)
    .eq('id', id)
    .order('match_number', { foreignTable: 'game_matches', ascending: true })
    .single();

  if (error) throw new Error(error.message);
  return data as Game;
};

const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.split(" ");
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const renderSkillStars = (level: number | undefined) => {
  const stars = [];
  for (let i = 1; i <= 3; i++) {
    stars.push(
      <StarIcon 
        key={i} 
        className={`h-3 w-3 ${i <= (level || 1) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const BabaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, isAdmin, gameTermSingular, gameTermPlural } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<GameMatch | null>(null);
  const [isStartingNewMatch, setIsStartingNewMatch] = useState(false);
  const [isSelectMatchTeamsDialogOpen, setIsSelectMatchTeamsDialogOpen] = useState(false);

  const [isDeleteMatchDialogOpen, setIsDeleteMatchDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<GameMatch | null>(null);
  const [isDeleteGameDialogOpen, setIsDeleteGameDialogOpen] = useState(false);

  const { data: game, isLoading, error, refetch } = useQuery<Game>({
    queryKey: ['game', id],
    queryFn: () => fetchGame(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex-grow flex items-center justify-center text-center">
        <p className="text-red-500">Erro ao carregar o {gameTermSingular}: {error?.message || `${gameTermSingular} não encontrado.`}</p>
      </div>
    );
  }

  const gameDate = parseISO(game.game_date);
  
  const allConfirmed = [
    ...game.games_players.map(p => ({
      ...p.profiles,
      type: 'profile' as const,
      join_table_id: p.id,
      skill_level: p.profiles.skill_level,
      total_goals: p.profiles.total_goals,
    })),
    ...game.games_guest_players.map(g => ({
      id: g.guest_players.id.toString(),
      full_name: g.guest_players.full_name,
      profile_picture_url: null,
      type: 'guest' as const,
      join_table_id: g.id,
      skill_level: g.guest_players.skill_level,
      total_goals: g.guest_players.total_goals,
    }))
  ];

  const confirmedPlayerIds = game.games_players.map(p => p.player_id);

  const isConfirmed = game.games_players.some(p => p.player_id === profile?.id);
  const isGameFull = allConfirmed.length >= game.max_players;
  const isGameFinished = game.status === 'Finalizado' || game.status === 'Cancelado' || gameDate < new Date();
  const isSuspended = profile?.is_suspended || false;

  const handlePresenceChange = () => {
    queryClient.invalidateQueries({ queryKey: ['game', id] });
  };

  const handleSaveTeams = async (teams: Team[]) => {
    const { error } = await supabase
      .from('games')
      .update({ generated_teams: teams })
      .eq('id', game.id);
    if (error) {
      showError("Erro ao salvar times.");
      throw error;
    }
    showSuccess("Times salvos com sucesso!");
    refetch();
  };

  const getPlayersFromTeams = (teams: Team[] | null) => {
    if (!teams || teams.length === 0) return [];
    return teams.flatMap(team => team.players.map(p => p.id));
  };

  const savedPlayerIds = getPlayersFromTeams(game.generated_teams).sort();
  const currentPlayerIds = allConfirmed.map(p => p.id).sort();
  const isPlayerListUnchanged = JSON.stringify(savedPlayerIds) === JSON.stringify(currentPlayerIds);

  const handleViewOnMap = () => {
    if (game.arenas?.address) {
      const encodedAddress = encodeURIComponent(game.arenas.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      showError("Endereço não disponível para esta arena.");
    }
  };

  const handleStartNewMatchClick = () => {
    if (!game.generated_teams || game.generated_teams.length < 2) {
      showError("É necessário ter pelo menos 2 times gerados para iniciar uma partida.");
      return;
    }
    setIsSelectMatchTeamsDialogOpen(true);
  };

  const handleMatchCreated = () => {
    refetch();
    setIsSelectMatchTeamsDialogOpen(false);
  };

  const handleViewScoreboard = (match: GameMatch) => {
    setSelectedMatch(match);
    setIsScoreboardOpen(true);
  };

  const handleScoreboardClose = () => {
    setIsScoreboardOpen(false);
    setSelectedMatch(null);
    refetch();
  };

  const handleDeleteMatchClick = (match: GameMatch) => {
    setMatchToDelete(match);
    setIsDeleteMatchDialogOpen(true);
  };

  const handleConfirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    try {
      const { error } = await supabase
        .from('game_matches')
        .delete()
        .eq('id', matchToDelete.id);

      if (error) throw error;
      showSuccess("Partida excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['game', id] });
      setIsDeleteMatchDialogOpen(false);
      setMatchToDelete(null);
    } catch (error: any) {
      showError(error.message || "Erro ao excluir partida.");
    }
  };

  const handleDeleteGameClick = () => {
    setIsDeleteGameDialogOpen(true);
  };

  const handleConfirmDeleteGame = async () => {
    if (!game) return;
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (error) throw error;
      showSuccess(`${gameTermSingular} excluído com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['games'] });
      navigate('/babas');
    } catch (error: any) {
      showError(error.message || `Erro ao excluir ${gameTermSingular}.`);
    }
  };

  const lastCompletedMatch = game.game_matches
    .filter(match => match.status === 'completed')
    .sort((a, b) => new Date(b.end_time || 0).getTime() - new Date(a.end_time || 0).getTime())[0] || null;

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b">
          <div className="container mx-auto px-4 py-3">
            <Button asChild variant="ghost">
              <Link to="/babas" className="flex items-center gap-2 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Voltar para todos os {gameTermPlural.toLowerCase()}
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl capitalize">{`${gameTermSingular} de ${format(gameDate, "eeee, dd/MM/yyyy", { locale: ptBR })}`}</CardTitle>
              <CardDescription>{game.notes || `Sem observações para este ${gameTermSingular}.`}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span>{format(gameDate, "HH:mm")}</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><span>{game.arenas?.name || 'A definir'}</span></div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span>{allConfirmed.length} / {game.max_players}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><span>{game.status}</span></div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span>Duração: {game.default_match_duration_minutes} min</span></div>
              <div className="flex items-center gap-2"><GoalIcon className="h-4 w-4 text-primary" /><span>Vitória: {game.default_match_win_goals} gols</span></div>
            </CardContent>
          </Card>

          {game.arenas?.address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{game.arenas.address}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewOnMap}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver Mapa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {profile && (
            <Card>
              <CardHeader><CardTitle>Minhas Ações</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <PresenceButton
                  gameId={game.id}
                  isConfirmed={isConfirmed}
                  isGameFull={isGameFull}
                  isGameFinished={isGameFinished}
                  isSuspended={isSuspended}
                />
                <GuestPresenceManager
                  gameId={game.id}
                  onPresenceChange={handlePresenceChange}
                  isAdmin={isAdmin}
                  userId={profile?.id || null}
                  disabled={isGameFinished}
                />
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardHeader><CardTitle>Controles de Administrador</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <PlayerPresenceManager gameId={game.id} confirmedPlayerIds={confirmedPlayerIds} onPresenceChange={handlePresenceChange} />
                <Button variant="outline" onClick={() => setIsGameDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /> Editar {gameTermSingular}</Button>
                <Button 
                  variant="default" 
                  onClick={handleStartNewMatchClick}
                  disabled={isStartingNewMatch || !game.generated_teams || game.generated_teams.length < 2}
                >
                  <PlayIcon className="mr-2 h-4 w-4" />
                  {isStartingNewMatch ? "Iniciando..." : "Iniciar Nova Partida"}
                </Button>
                <Button variant="destructive" onClick={handleDeleteGameClick}>
                  <Trash2Icon className="mr-2 h-4 w-4" /> Excluir {gameTermSingular}
                </Button>
              </CardContent>
            </Card>
          )}

          {game.game_matches && game.game_matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListIcon className="h-5 w-5" />
                  Partidas do {gameTermSingular}
                </CardTitle>
                <CardDescription>Gerencie as partidas jogadas neste {gameTermSingular.toLowerCase()}.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {game.game_matches.map(match => (
                    <div key={match.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium">Partida {match.match_number}: {match.team1_name} vs {match.team2_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Placar: {match.score1} - {match.score2} | Status: <Badge variant="secondary">{match.status}</Badge>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleViewScoreboard(match)}>
                          <PlayIcon className="mr-2 h-4 w-4" /> Ver Placar
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteMatchClick(match)}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader><CardTitle>Jogadores Confirmados ({allConfirmed.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {allConfirmed.map((player) => (
                    <div key={`${player.type}-${player.id}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-grow">
                        <Avatar className="h-8 w-8"><AvatarImage src={player.profile_picture_url || ""} /><AvatarFallback>{getInitials(player.full_name)}</AvatarFallback></Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium break-words">{player.full_name}</span>
                          <div className="flex items-center gap-1">
                            {player.type === 'guest' && <Badge variant="secondary" className="h-4 px-1 text-xs">Convidado</Badge>}
                            {renderSkillStars(player.skill_level)}
                            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <GoalIcon className="h-3 w-3" /> {player.total_goals || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        player.type === 'player' ? (
                          <RemovePlayerButton gamePlayerId={player.join_table_id} gameId={game.id} />
                        ) : (
                          <RemoveGuestButton gameGuestPlayerId={player.join_table_id} gameId={game.id} />
                        )
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <TeamGenerator
                currentPlayers={allConfirmed}
                savedTeams={game.generated_teams}
                onSaveTeams={handleSaveTeams}
                isPlayerListUnchanged={isPlayerListUnchanged}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </main>
      </div>
      <GameDialog isOpen={isGameDialogOpen} onOpenChange={setIsGameDialogOpen} game={game} />

      {selectedMatch && (
        <Dialog open={isScoreboardOpen} onOpenChange={setIsScoreboardOpen}>
          <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Placar Eletrônico - Partida {selectedMatch.match_number}</DialogTitle>
              <DialogDescription>
                Acompanhe e gerencie o placar em tempo real.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow pr-4">
              <Scoreboard
                gameMatch={selectedMatch}
                allPlayers={allConfirmed}
                generatedTeams={game.generated_teams}
                onMatchUpdate={handleScoreboardClose}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      <SelectMatchTeamsDialog
        isOpen={isSelectMatchTeamsDialogOpen}
        onOpenChange={setIsSelectMatchTeamsDialogOpen}
        gameId={game.id}
        generatedTeams={game.generated_teams}
        lastCompletedMatch={lastCompletedMatch}
        defaultMatchDurationMinutes={game.default_match_duration_minutes}
        defaultMatchWinGoals={game.default_match_win_goals}
        onMatchCreated={handleMatchCreated}
      />

      <AlertDialog open={isDeleteMatchDialogOpen} onOpenChange={setIsDeleteMatchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão da Partida?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a partida "<strong>{matchToDelete?.team1_name} vs {matchToDelete?.team2_name}</strong>"? Esta ação é irreversível e removerá todos os gols associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteMatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Partida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteGameDialogOpen} onOpenChange={setIsDeleteGameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão do {gameTermSingular}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o {gameTermSingular.toLowerCase()} de "<strong>{format(gameDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>"? Esta ação é irreversível e removerá todas as presenças, times gerados, partidas e gols associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir {gameTermSingular}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BabaDetailPage;