"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarIcon, UsersIcon, TrophyIcon, EditIcon, CheckCircle, Trash2Icon, MapPinIcon, ScrollTextIcon, ArrowRightIcon, UserCheckIcon, UserPlusIcon, DollarSignIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { showError, showSuccess } from "@/utils/toast";
import TournamentTeamGenerator from "@/components/tournaments/TournamentTeamGenerator";
import KnockoutBracket from "@/components/tournaments/KnockoutBracket";
import GroupStageDisplay from "@/components/tournaments/GroupStageDisplay";
import TournamentForm, { TournamentFormData, Tournament as TournamentType } from "@/components/tournaments/TournamentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import TournamentPaymentModal from "@/components/tournaments/TournamentPaymentModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TournamentPlayer {
  id: string;
  full_name: string;
  profile_picture_url?: string | null;
  type: 'profile' | 'guest';
}

interface TournamentTeam {
  id: string;
  name: string;
  group_name: string | null;
  players: {
    id: string;
    full_name: string;
    profile_picture_url?: string | null;
    type: 'profile' | 'guest';
  }[];
}

interface TournamentMatch {
  id: string;
  round: string;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  score1: number | null;
  score2: number | null;
  winner_team_id: string | null;
  match_date: string | null;
  arena_id: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface Arena {
  id: number;
  name: string;
  address: string;
}

interface TournamentDetailData extends TournamentType {
  tournament_teams: {
    id: string;
    name: string;
    group_name: string | null;
    tournament_team_players: {
      player_id: string | null;
      guest_player_id: number | null;
      profiles: { id: string; full_name: string; profile_picture_url: string | null } | null;
      guest_players: { id: number; full_name: string } | null;
    }[];
  }[];
  tournament_matches: TournamentMatch[];
  arenas: Arena | null;
  is_registered?: boolean;
  user_registration_status?: 'pendente' | 'pago' | 'isento';
  pix_info?: string | null;
}

const fetchTournamentDetail = async (id: string, userId: string | undefined): Promise<TournamentDetailData> => {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      arenas(id, name, address),
      tournament_teams!tournament_id(
        id,
        name,
        group_name,
        tournament_team_players(
          player_id,
          guest_player_id,
          profiles(id, full_name, profile_picture_url),
          guest_players(id, full_name)
        )
      ),
      tournament_matches(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  const processedTeams: TournamentTeam[] = (data.tournament_teams || []).map(team => ({
    id: team.id,
    name: team.name,
    group_name: team.group_name,
    players: (team.tournament_team_players || []).map(ttp => {
      if (ttp.profiles) {
        return {
          id: ttp.profiles.id,
          full_name: ttp.profiles.full_name || '',
          profile_picture_url: ttp.profiles.profile_picture_url,
          type: 'profile',
        };
      } else if (ttp.guest_players) {
        return {
          id: ttp.guest_players.id.toString(),
          full_name: ttp.guest_players.full_name || '',
          profile_picture_url: null,
          type: 'guest',
        };
      }
      return { id: '', full_name: 'Desconhecido', type: 'profile' };
    }).filter(p => p.id !== '') as TournamentPlayer[],
  }));

  let isRegistered = false;
  let userRegistrationStatus: 'pendente' | 'pago' | 'isento' = 'pendente';
  if (userId) {
    const { data: userReg, error: userRegError } = await supabase
      .from('tournament_registrations')
      .select('id, payment_status')
      .eq('tournament_id', id)
      .eq('player_id', userId)
      .single();
    if (userRegError && userRegError.code !== 'PGRST116') console.error("Error fetching user registration:", userRegError);
    isRegistered = !!userReg;
    if (userReg) {
      userRegistrationStatus = userReg.payment_status as 'pendente' | 'pago' | 'isento';
    }
  }

  return {
    ...data,
    tournament_teams: processedTeams,
    tournament_matches: data.tournament_matches || [],
    arenas: data.arenas,
    is_registered: isRegistered,
    user_registration_status: userRegistrationStatus,
  } as TournamentDetailData;
};

const TournamentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, loading: authLoading, user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [allArenas, setAllArenas] = useState<Arena[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: tournament, isLoading, error, refetch } = useQuery<TournamentDetailData>({
    queryKey: ['tournament', id, user?.id],
    queryFn: () => fetchTournamentDetail(id!, user?.id),
    enabled: !!id && !authLoading,
  });

  useEffect(() => {
    const fetchArenas = async () => {
      const { data, error } = await supabase
        .from('arenas')
        .select('id, name, address')
        .order('name');
      if (error) {
        console.error("Error fetching arenas:", error);
      } else {
        setAllArenas(data || []);
      }
    };
    fetchArenas();
  }, []);

  const handleTournamentUpdate = async (formData: TournamentFormData) => {
    if (!tournament || !isAdmin) {
      showError("Você não tem permissão para editar torneios.");
      return;
    }
    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();

      const updateData = {
        name: formData.name,
        type: formData.type,
        num_teams: parseInt(formData.numTeams, 10),
        num_players_per_team: parseInt(formData.numPlayersPerTeam, 10),
        num_groups: formData.type === 'campeonato' && formData.numGroups ? parseInt(formData.numGroups, 10) : null,
        regulations: formData.regulations || null,
        arena_id: formData.arenaId ? parseInt(formData.arenaId, 10) : null,
        start_date: startDateTime,
        has_enrollment_fee: formData.hasEnrollmentFee,
        enrollment_fee_amount: formData.hasEnrollmentFee && formData.enrollmentFeeAmount ? parseFloat(formData.enrollmentFeeAmount) : 0,
        pix_info: formData.hasEnrollmentFee ? formData.pixInfo || null : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('tournaments').update(updateData).eq('id', tournament.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      setIsFormDialogOpen(false);
      showSuccess("Torneio atualizado com sucesso!");
    } catch (err: any) {
      showError(err.message || "Erro ao atualizar torneio.");
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament || !isAdmin) {
      showError("Você não tem permissão para excluir torneios.");
      return;
    }
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', tournament.id);
      if (error) throw error;
      showSuccess("Torneio excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      navigate('/torneios');
    } catch (err: any) {
      showError(err.message || "Erro ao excluir torneio.");
    }
  };

  const handleTeamsGenerated = () => {
    refetch();
  };

  const handleMatchUpdate = () => {
    refetch();
  };

  const handleRegisterToggle = async () => {
    if (!user || !profile) {
      showError("Você precisa estar logado para se inscrever.");
      return;
    }
    if (profile.is_suspended) {
      showError("Você está suspenso e não pode se inscrever em torneios.");
      return;
    }
    if (tournament?.status !== 'draft' && tournament?.status !== 'registration_open') {
      showError("As inscrições para este torneio não estão abertas.");
      return;
    }

    setIsRegistering(true);
    try {
      if (tournament?.is_registered) {
        const { error } = await supabase
          .from('tournament_registrations')
          .delete()
          .eq('tournament_id', tournament.id)
          .eq('player_id', user.id);
        if (error) throw error;
        showSuccess("Inscrição cancelada com sucesso!");
      } else {
        const { error } = await supabase
          .from('tournament_registrations')
          .insert({
            tournament_id: tournament.id,
            player_id: user.id,
            payment_status: tournament.has_enrollment_fee ? 'pendente' : 'isento',
            enrollment_fee_paid: tournament.has_enrollment_fee ? tournament.enrollment_fee_amount : 0,
          });
        if (error) throw error;
        showSuccess("Inscrição realizada com sucesso!");
      }
      refetch();
    } catch (err: any) {
      showError(err.message || "Erro ao gerenciar inscrição.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePayEnrollment = () => {
    if (!tournament?.has_enrollment_fee || !tournament.enrollment_fee_amount) {
      showError("Este torneio não possui taxa de inscrição.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const generateNextKnockoutRound = async () => {
    if (!tournament || !isAdmin) return;

    const currentRoundMatches = tournament.tournament_matches.filter(m => m.status !== 'completed');
    if (currentRoundMatches.length > 0) {
      showError("Nem todas as partidas da fase atual foram concluídas. Por favor, insira todos os resultados.");
      return;
    }

    const completedMatches = tournament.tournament_matches.filter(m => m.status === 'completed');
    if (completedMatches.length === 0) {
      showError("Nenhuma partida concluída para gerar a próxima fase.");
      return;
    }

    const currentRoundName = completedMatches[0].round;
    const winners = completedMatches.map(m => m.winner_team_id).filter(Boolean) as string[];

    if (winners.length < 2) {
      showError("Não há vencedores suficientes para gerar a próxima fase.");
      return;
    }

    let nextRoundName = '';
    let nextRoundNumMatches = 0;

    if (currentRoundName.includes('Round of 32')) {
      nextRoundName = 'Round of 16';
      nextRoundNumMatches = 8;
    } else if (currentRoundName.includes('Round of 16')) {
      nextRoundName = 'Quarter-final';
      nextRoundNumMatches = 4;
    } else if (currentRoundName.includes('Quarter-final')) {
      nextRoundName = 'Semi-final';
      nextRoundNumMatches = 2;
    } else if (currentRoundName.includes('Semi-final')) {
      nextRoundName = 'Final';
      nextRoundNumMatches = 1;
    } else if (currentRoundName.includes('Final')) {
      showSuccess("O torneio já está na final!");
      return;
    } else {
      showError("Não foi possível determinar a próxima fase automaticamente.");
      return;
    }

    if (winners.length !== nextRoundNumMatches * 2) {
      showError(`Número de vencedores (${winners.length}) não corresponde ao esperado para a próxima fase (${nextRoundNumMatches * 2}).`);
      return;
    }

    const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
    const newMatchesToInsert: any[] = [];

    for (let i = 0; i < nextRoundNumMatches; i++) {
      newMatchesToInsert.push({
        tournament_id: tournament.id,
        round: nextRoundName,
        match_number: i + 1,
        team1_id: shuffledWinners[i * 2],
        team2_id: shuffledWinners[i * 2 + 1],
        status: 'scheduled',
        arena_id: tournament.arena_id,
      });
    }

    try {
      const { error: insertError } = await supabase
        .from('tournament_matches')
        .insert(newMatchesToInsert);

      if (insertError) throw insertError;
      showSuccess(`Próxima fase (${nextRoundName}) gerada com sucesso!`);
      refetch();
    } catch (error: any) {
      showError(error.message || "Erro ao gerar a próxima fase.");
    }
  };

  const handleDeclareWinner = async (winnerTeamId: string) => {
    if (!tournament || !isAdmin) return;
    if (!confirm(`Tem certeza que deseja declarar ${tournament.tournament_teams.find(t => t.id === winnerTeamId)?.name} como o campeão do torneio?`)) return;

    try {
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'finished',
          champion_team_id: winnerTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tournament.id);

      if (updateError) throw updateError;
      showSuccess("Campeão do torneio declarado com sucesso!");
      refetch();
    } catch (error: any) {
      showError(error.message || "Erro ao declarar o campeão.");
    }
  };

  const handleViewOnMap = () => {
    if (tournament.arenas?.address) {
      const encodedAddress = encodeURIComponent(tournament.arenas.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      showError("Endereço não disponível para esta arena.");
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex-grow flex items-center justify-center text-center">
        <p className="text-red-500">Erro ao carregar o torneio: {error?.message || "Torneio não encontrado."}</p>
      </div>
    );
  }

  const allTeams: TournamentTeam[] = tournament.tournament_teams || [];
  const allMatches: TournamentMatch[] = tournament.tournament_matches || [];
  const tournamentArenaName = tournament.arenas?.name || 'Não definido';
  const tournamentStartDateTime = new Date(tournament.start_date);
  const totalRegisteredPlayers = allTeams.flatMap(team => team.players).length;
  const maxPlayersLimit = tournament.num_teams * tournament.num_players_per_team;

  const canGenerateNextRound = isAdmin && tournament.type === 'copa' && allMatches.length > 0 && allMatches.every(m => m.status === 'completed') && !tournament.champion_team_id;
  const isFinalRoundCompleted = tournament.type === 'copa' && allMatches.some(m => m.round === 'Final' && m.status === 'completed');
  const canDeclareWinner = isAdmin && isFinalRoundCompleted && !tournament.champion_team_id;

  const canRegister = user && (tournament.status === 'draft' || tournament.status === 'registration_open') && !profile?.is_suspended;
  const isUserRegistered = tournament.is_registered;
  const isPaymentPending = isUserRegistered && tournament.has_enrollment_fee && tournament.user_registration_status === 'pendente';
  const isPaymentPaid = isUserRegistered && tournament.has_enrollment_fee && tournament.user_registration_status === 'pago';
  const isTournamentFull = totalRegisteredPlayers >= maxPlayersLimit;

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b">
          <div className="container mx-auto px-4 py-3">
            <Button asChild variant="ghost">
              <Link to="/torneios" className="flex items-center gap-2 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Voltar para todos os torneios
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsFormDialogOpen(true)}>
                      <EditIcon className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2Icon className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription className="flex items-center gap-2">
                <TrophyIcon className="h-4 w-4 text-muted-foreground" />
                <Badge className="bg-yellow-500 text-black">{tournament.type === 'copa' ? 'Copa' : 'Campeonato'}</Badge>
                <Badge variant="secondary">
                  {tournament.status === 'draft' ? 'Rascunho' : tournament.status === 'registration_open' ? 'Inscrições Abertas' : 'Em Andamento'}
                </Badge>
                {tournament.has_enrollment_fee && tournament.enrollment_fee_amount && (
                  <Button variant="secondary" size="sm" onClick={handlePayEnrollment} className="h-6 px-2 py-1 text-xs">
                    <DollarSignIcon className="mr-1 h-3 w-3" /> Inscrição: R$ {tournament.enrollment_fee_amount.toFixed(2)}
                  </Button>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /><span>Início: {format(tournamentStartDateTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span></div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-primary" />
                <span>Local: {tournamentArenaName}</span>
                {tournament.arenas?.address && (
                  <Button variant="ghost" size="icon" onClick={handleViewOnMap} className="h-6 w-6">
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2"><UsersIcon className="h-4 w-4 text-primary" /><span>{totalRegisteredPlayers} / {maxPlayersLimit} Jogadores Inscritos</span></div>
            </CardContent>
          </Card>

          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isUserRegistered ? <UserCheckIcon className="text-green-500" /> : <UserPlusIcon className="text-primary" />}
                  Inscrição
                </CardTitle>
                <CardDescription>
                  {isUserRegistered ? "Você está inscrito neste torneio." : "Inscreva-se para participar deste torneio."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {isUserRegistered ? (
                  <>
                    {isPaymentPending && (
                      <Badge variant="destructive" className="mb-2">Pagamento Pendente</Badge>
                    )}
                    {isPaymentPaid && (
                      <Badge className="bg-green-500 text-white mb-2">Pagamento Confirmado</Badge>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={isRegistering}>
                          {isRegistering ? "Cancelando..." : "Cancelar Inscrição"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Cancelamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja cancelar sua inscrição no torneio "<strong>{tournament.name}</strong>"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRegisterToggle} disabled={isRegistering}>
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isPaymentPending && (
                      <Button onClick={handlePayEnrollment} className="w-full mt-2">
                        <DollarSignIcon className="mr-2 h-4 w-4" /> Pagar Inscrição
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleRegisterToggle}
                    disabled={isRegistering || !canRegister || isTournamentFull}
                  >
                    {isRegistering ? "Inscrevendo..." : (isTournamentFull ? "Torneio Lotado" : "Inscrever-se")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollTextIcon className="h-5 w-5 text-primary" />
                Regulamento do Torneio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.regulations ? (
                <p className="text-muted-foreground whitespace-pre-line">{tournament.regulations}</p>
              ) : (
                <p className="text-muted-foreground">Nenhum regulamento definido para este torneio.</p>
              )}
            </CardContent>
          </Card>

          <TournamentTeamGenerator
            tournament={tournament}
            existingTeams={allTeams}
            onTeamsGenerated={handleTeamsGenerated}
          />

          {isAdmin && tournament.type === 'copa' && allTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary" />
                  Gerar Próxima Fase
                </CardTitle>
                <CardDescription>
                  {tournament.champion_team_id 
                    ? "Um campeão já foi declarado para este torneio."
                    : "Gere a próxima rodada do mata-mata após todas as partidas da fase atual serem concluídas."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={generateNextKnockoutRound}
                  disabled={!canGenerateNextRound}
                  className="w-full"
                >
                  Gerar Próxima Fase
                </Button>
              </CardContent>
            </Card>
          )}

          {isAdmin && tournament.type === 'copa' && isFinalRoundCompleted && !tournament.champion_team_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-primary" />
                  Declarar Campeão
                </CardTitle>
                <CardDescription>
                  A final foi concluída. Selecione o time vencedor para encerrar o torneio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleDeclareWinner}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o time campeão" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTeams.filter(t => t.id === allMatches.find(m => m.round === 'Final')?.winner_team_id).map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {tournament.champion_team_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  Campeão do Torneio!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-center text-yellow-600">
                  {allTeams.find(t => t.id === tournament.champion_team_id)?.name}
                </p>
              </CardContent>
            </Card>
          )}

          {allTeams.length > 0 && (
            tournament.type === 'copa' ? (
              <KnockoutBracket teams={allTeams} matches={allMatches} arenas={allArenas} onMatchUpdate={handleMatchUpdate} />
            ) : (
              <GroupStageDisplay teams={allTeams} matches={allMatches} arenas={allArenas} numGroups={tournament.num_groups || 0} onMatchUpdate={handleMatchUpdate} />
            )
          )}
        </main>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Torneio</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <TournamentForm
              tournament={tournament}
              onSubmit={handleTournamentUpdate}
              onCancel={() => setIsFormDialogOpen(false)}
              isSubmitting={isLoading}
            />
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" form="tournament-form" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão do Torneio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o torneio "<strong>{tournament.name}</strong>"? Esta ação é irreversível e removerá todos os times e partidas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTournament} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Torneio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {tournament.has_enrollment_fee && tournament.enrollment_fee_amount && (
        <TournamentPaymentModal
          isOpen={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          amount={tournament.enrollment_fee_amount}
          tournamentName={tournament.name}
          pixInfo={tournament.pix_info || undefined}
        />
      )}
    </>
  );
};

export default TournamentDetailPage;