"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlayIcon, PauseIcon, StopCircleIcon, PlusIcon, MinusIcon, GoalIcon, UsersIcon, ClockIcon, CheckCircleIcon, XCircleIcon, TrophyIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { format, addMinutes, isPast, differenceInSeconds, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
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
} from "@/components/ui/alert-dialog";

interface Player {
  id: string;
  full_name: string;
  type: 'profile' | 'guest';
  profile_picture_url?: string | null;
}

interface Team {
  name: string;
  players: Player[];
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

interface GameGoal {
  id: string;
  game_match_id: string;
  scoring_player_id: string | null;
  scoring_guest_player_id: number | null;
  scoring_team_name: string;
  created_at: string;
  profiles: { full_name: string } | null;
  guest_players: { full_name: string } | null;
}

interface ScoreboardProps {
  gameMatch: GameMatch;
  allPlayers: Player[];
  onMatchUpdate: () => void;
  generatedTeams: Team[] | null;
}

const Scoreboard = ({ gameMatch: initialGameMatch, allPlayers, onMatchUpdate, generatedTeams }: ScoreboardProps) => {
  const { isAdmin } = useAuth();
  const [gameMatch, setGameMatch] = useState<GameMatch>(initialGameMatch);
  const [goals, setGoals] = useState<GameGoal[]>([]);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [scoringTeam, setScoringTeam] = useState<string | null>(null);
  const [scoringPlayerId, setScoringPlayerId] = useState<string | null>(null);
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [isConfirmEndMatchOpen, setIsConfirmEndMatchOpen] = useState(false);

  const [playersInSelectedScoringTeam, setPlayersInSelectedScoringTeam] = useState<Player[]>([]);

  const isMatchInProgress = gameMatch.status === 'in_progress';
  const isMatchCompleted = gameMatch.status === 'completed';
  const isMatchCancelled = gameMatch.status === 'cancelled';
  const isMatchFinished = isMatchCompleted || isMatchCancelled;

  const fetchMatchDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('game_matches')
        .select('*')
        .eq('id', initialGameMatch.id)
        .single();
      if (error) throw error;
      setGameMatch(data);

      const { data: goalsData, error: goalsError } = await supabase
        .from('game_goals')
        .select(`
          id,
          game_match_id,
          scoring_player_id,
          scoring_guest_player_id,
          scoring_team_name,
          created_at,
          profiles(full_name),
          guest_players(full_name)
        `)
        .eq('game_match_id', initialGameMatch.id)
        .order('created_at', { ascending: false });
      if (goalsError) throw goalsError;
      
      setGoals(goalsData || []);
    } catch (error: any) {
      console.error("Error fetching match details:", error);
      showError(error.message || "Erro ao carregar detalhes da partida.");
    }
  }, [initialGameMatch.id]);

  const handleEndMatch = useCallback(async (cancelled: boolean = false) => {
    if (!isAdmin && gameMatch.start_time && !isPast(addMinutes(parseISO(gameMatch.start_time), gameMatch.duration_minutes))) return;

    let winnerTeamName: string | null = null;
    let status: 'completed' | 'cancelled' = 'completed';

    if (cancelled) {
      status = 'cancelled';
    } else if (gameMatch.score1 > gameMatch.score2) {
      winnerTeamName = gameMatch.team1_name;
    } else if (gameMatch.score2 > gameMatch.score1) {
      winnerTeamName = gameMatch.team2_name;
    }

    try {
      const { error } = await supabase
        .from('game_matches')
        .update({ status, end_time: new Date().toISOString(), winner_team_name: winnerTeamName })
        .eq('id', gameMatch.id);
      if (error) throw error;
      showSuccess(cancelled ? "Partida cancelada." : "Partida finalizada!");
      onMatchUpdate();
    } catch (error: any) {
      showError(error.message || "Erro ao finalizar partida.");
    }
  }, [isAdmin, gameMatch, onMatchUpdate]);

  useEffect(() => {
    fetchMatchDetails();

    const channel = supabase
      .channel(`game_match_${initialGameMatch.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_matches', filter: `id=eq.${initialGameMatch.id}` }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setGameMatch(payload.new as GameMatch);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_goals', filter: `game_match_id=eq.${initialGameMatch.id}` }, () => {
        fetchMatchDetails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialGameMatch.id, fetchMatchDetails]);

  useEffect(() => {
    if (gameMatch.status === 'in_progress' && gameMatch.start_time) {
      const startTime = parseISO(gameMatch.start_time);
      const endTime = addMinutes(startTime, gameMatch.duration_minutes);
      
      if (isPast(endTime)) {
        if (isAdmin) {
          setIsConfirmEndMatchOpen(true);
        } else {
          handleEndMatch();
        }
        return;
      }

      const calculateRemainingTime = () => {
        const now = new Date();
        const remaining = differenceInSeconds(endTime, now);
        if (remaining <= 0) {
          setTimer(0);
          setTimerActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          if (gameMatch.status === 'in_progress') {
            if (isAdmin) {
              setIsConfirmEndMatchOpen(true);
            } else {
              handleEndMatch();
            }
          }
        } else {
          setTimer(remaining);
          setTimerActive(true);
        }
      };

      calculateRemainingTime();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(calculateRemainingTime, 1000);

    } else {
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameMatch.status === 'scheduled') {
        setTimer(gameMatch.duration_minutes * 60);
      } else if (gameMatch.status === 'completed' || gameMatch.status === 'cancelled') {
        setTimer(0);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameMatch, isAdmin, handleEndMatch]);

  useEffect(() => {
    if (scoringTeam && generatedTeams) {
      const team = generatedTeams.find(t => t.name === scoringTeam);
      if (team) {
        setPlayersInSelectedScoringTeam(team.players);
      } else {
        setPlayersInSelectedScoringTeam([]);
      }
    } else {
      setPlayersInSelectedScoringTeam([]);
    }
  }, [scoringTeam, generatedTeams]);

  useEffect(() => {
    if (isMatchInProgress && gameMatch.win_condition_goals > 0) {
      if (gameMatch.score1 >= gameMatch.win_condition_goals || gameMatch.score2 >= gameMatch.win_condition_goals) {
        if (isAdmin) {
          setIsConfirmEndMatchOpen(true);
        } else {
          handleEndMatch();
        }
      }
    }
  }, [gameMatch.score1, gameMatch.score2, gameMatch.win_condition_goals, isMatchInProgress, isAdmin, handleEndMatch]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartMatch = async () => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('game_matches')
        .update({ status: 'in_progress', start_time: new Date().toISOString() })
        .eq('id', gameMatch.id);
      if (error) throw error;
      showSuccess("Partida iniciada!");
      await fetchMatchDetails();
    } catch (error: any) {
      showError(error.message || "Erro ao iniciar partida.");
    }
  };

  const handlePauseMatch = async () => {
    if (!isAdmin) return;
    try {
      const startTime = parseISO(gameMatch.start_time!);
      const now = new Date();
      const elapsedMinutes = Math.floor(differenceInSeconds(now, startTime) / 60);
      const newDuration = gameMatch.duration_minutes - elapsedMinutes;

      const { error } = await supabase
        .from('game_matches')
        .update({ status: 'scheduled', start_time: null, duration_minutes: newDuration > 0 ? newDuration : 0 })
        .eq('id', gameMatch.id);
      if (error) throw error;
      showSuccess("Partida pausada.");
      await fetchMatchDetails();
    } catch (error: any) {
      showError(error.message || "Erro ao pausar partida.");
    }
  };

  const handleAddGoal = async () => {
    if (!scoringTeam) {
      showError("Selecione o time que marcou o gol.");
      return;
    }
    if (!scoringPlayerId) {
      showError("Selecione o jogador que marcou o gol.");
      return;
    }

    setIsSubmittingGoal(true);
    try {
      let playerProfileId: string | null = null;
      let playerGuestId: number | null = null;

      const parts = scoringPlayerId.split('-');
      const playerType = parts.shift(); // Removes and returns the first element, e.g., "profile"
      const playerId = parts.join('-'); // Joins the rest, correctly handling UUIDs

      if (playerType === 'profile' && playerId) {
        playerProfileId = playerId;
      } else if (playerType === 'guest' && playerId) {
        playerGuestId = parseInt(playerId, 10);
      } else {
        throw new Error(`Formato de ID de jogador inválido: ${scoringPlayerId}`);
      }

      if (!playerProfileId && !playerGuestId) {
        throw new Error("Não foi possível identificar o jogador que marcou o gol.");
      }

      const { error } = await supabase
        .from('game_goals')
        .insert({
          game_match_id: gameMatch.id,
          scoring_team_name: scoringTeam,
          scoring_player_id: playerProfileId,
          scoring_guest_player_id: playerGuestId,
        });
      if (error) throw error;

      const newScore1 = scoringTeam === gameMatch.team1_name ? gameMatch.score1 + 1 : gameMatch.score1;
      const newScore2 = scoringTeam === gameMatch.team2_name ? gameMatch.score2 + 1 : gameMatch.score2;

      const { error: updateError } = await supabase
        .from('game_matches')
        .update({ score1: newScore1, score2: newScore2 })
        .eq('id', gameMatch.id);
      if (updateError) throw updateError;

      showSuccess("Gol registrado!");
      setIsGoalDialogOpen(false);
      setScoringTeam(null);
      setScoringPlayerId(null);
      fetchMatchDetails();
    } catch (error: any) {
      showError(error.message || "Erro ao registrar gol.");
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const handleRemoveLastGoal = async () => {
    if (!isAdmin || goals.length === 0) return;
    if (!confirm("Tem certeza que deseja remover o último gol?")) return;

    setIsSubmittingGoal(true);
    try {
      const lastGoal = goals[0];
      const { error: deleteError } = await supabase
        .from('game_goals')
        .delete()
        .eq('id', lastGoal.id);
      if (deleteError) throw deleteError;

      const newScore1 = lastGoal.scoring_team_name === gameMatch.team1_name ? gameMatch.score1 - 1 : gameMatch.score1;
      const newScore2 = lastGoal.scoring_team_name === gameMatch.team2_name ? gameMatch.score2 - 1 : gameMatch.score2;

      const { error: updateError } = await supabase
        .from('game_matches')
        .update({ score1: newScore1, score2: newScore2 })
        .eq('id', gameMatch.id);
      if (updateError) throw updateError;

      showSuccess("Último gol removido!");
      fetchMatchDetails();
    } catch (error: any) {
      showError(error.message || "Erro ao remover último gol.");
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  const progressValue = (timer / (gameMatch.duration_minutes * 60)) * 100;

  return (
    <div className="space-y-6 py-4">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
              <span className="w-full truncate text-center sm:w-auto sm:text-right">{gameMatch.team1_name}</span>
              <div className="flex items-center gap-2 text-4xl sm:text-5xl font-bold">
                <span className="text-primary">{gameMatch.score1}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-primary">{gameMatch.score2}</span>
              </div>
              <span className="w-full truncate text-center sm:w-auto sm:text-left">{gameMatch.team2_name}</span>
            </div>
          </CardTitle>
          <CardDescription className="text-lg font-medium pt-2">
            {isMatchCompleted ? (
              gameMatch.winner_team_name ? (
                <span className="text-green-600 flex items-center justify-center gap-2">
                  <TrophyIcon className="h-5 w-5" /> {gameMatch.winner_team_name} Venceu!
                </span>
              ) : (
                <span className="text-muted-foreground">Partida Finalizada (Empate ou Cancelada)</span>
              )
            ) : isMatchCancelled ? (
              <span className="text-red-600 flex items-center justify-center gap-2">
                <XCircleIcon className="h-5 w-5" /> Partida Cancelada
              </span>
            ) : (
              `Partida ${gameMatch.match_number}`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-2xl font-mono">
            <ClockIcon className="h-6 w-6 text-muted-foreground" />
            <span>{formatTime(timer)}</span>
          </div>
          <Progress value={progressValue} className="w-full h-2" />
          <div className="flex justify-center gap-2 text-sm text-muted-foreground">
            <span>Duração: {gameMatch.duration_minutes} min</span>
            <span>|</span>
            <span>Gols para vitória: {gameMatch.win_condition_goals}</span>
          </div>
        </CardContent>
      </Card>

      {isAdmin && !isMatchFinished && (
        <Card>
          <CardHeader><CardTitle>Controles do Placar</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 justify-center">
            {!isMatchInProgress ? (
              <Button onClick={handleStartMatch} disabled={isMatchFinished}>
                <PlayIcon className="mr-2 h-4 w-4" /> Iniciar Partida
              </Button>
            ) : (
              <Button onClick={handlePauseMatch}>
                <PauseIcon className="mr-2 h-4 w-4" /> Pausar Partida
              </Button>
            )}
            <Button onClick={() => setIsGoalDialogOpen(true)} disabled={!isMatchInProgress}>
              <PlusIcon className="mr-2 h-4 w-4" /> Registrar Gol
            </Button>
            <Button onClick={handleRemoveLastGoal} disabled={!isMatchInProgress || goals.length === 0}>
              <MinusIcon className="mr-2 h-4 w-4" /> Remover Último Gol
            </Button>
            <Button variant="destructive" onClick={() => handleEndMatch(true)} disabled={!isMatchInProgress}>
              <StopCircleIcon className="mr-2 h-4 w-4" /> Cancelar Partida
            </Button>
            <Button variant="secondary" onClick={() => handleEndMatch(false)} disabled={!isMatchInProgress}>
              <CheckCircleIcon className="mr-2 h-4 w-4" /> Finalizar Partida
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Histórico de Gols</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {goals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum gol registrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => {
                  const scorerName = goal.profiles?.full_name || goal.guest_players?.full_name;
                  const displayScorer = scorerName ? scorerName : 'Gol Contra';

                  return (
                    <div key={goal.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <GoalIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{goal.scoring_team_name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({displayScorer})
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(goal.created_at), 'HH:mm:ss', { locale: ptBR })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Novo Gol</DialogTitle>
            <DialogDescription>
              Selecione o time e o jogador que marcou o gol.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="scoring-team">Time</Label>
              <Select onValueChange={(value) => { setScoringTeam(value); setScoringPlayerId(null); }} value={scoringTeam || ''}>
                <SelectTrigger id="scoring-team">
                  <SelectValue placeholder="Selecione o time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={gameMatch.team1_name}>{gameMatch.team1_name}</SelectItem>
                  <SelectItem value={gameMatch.team2_name}>{gameMatch.team2_name}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scoringTeam && (
              <div>
                <Label htmlFor="scoring-player">Jogador</Label>
                <Select onValueChange={setScoringPlayerId} value={scoringPlayerId || ''}>
                  <SelectTrigger id="scoring-player">
                    <SelectValue placeholder="Selecione o jogador" />
                  </SelectTrigger>
                  <SelectContent>
                    {playersInSelectedScoringTeam.map(player => (
                      <SelectItem key={`${player.type}-${player.id}`} value={`${player.type}-${player.id}`}>
                        {player.full_name} ({player.type === 'profile' ? 'Jogador' : 'Convidado'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)} disabled={isSubmittingGoal}>Cancelar</Button>
            <Button onClick={handleAddGoal} disabled={isSubmittingGoal || !scoringTeam || scoringPlayerId === null}>
              {isSubmittingGoal ? "Registrando..." : "Registrar Gol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmEndMatchOpen} onOpenChange={setIsConfirmEndMatchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Partida?</AlertDialogTitle>
            <AlertDialogDescription>
              O número de gols para vitória foi atingido ou o tempo de partida acabou. Deseja finalizar a partida agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmEndMatchOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setIsConfirmEndMatchOpen(false);
              handleEndMatch();
            }}>
              Finalizar Partida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Scoreboard;