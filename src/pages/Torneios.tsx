"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, SearchIcon, TrophyIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import TournamentCard, { Tournament } from "@/components/tournaments/TournamentCard";
import TournamentForm, { TournamentFormData } from "@/components/tournaments/TournamentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

const TorneiosPage = () => {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;

      const tournamentsWithDetails = await Promise.all(
        (tournamentsData || []).map(async (t) => {
          const { count: registeredCount, error: countError } = await supabase
            .from('tournament_registrations')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', t.id);
          if (countError) console.error("Error fetching registration count:", countError);

          let isRegistered = false;
          if (user?.id) {
            const { data: userReg, error: userRegError } = await supabase
              .from('tournament_registrations')
              .select('id')
              .eq('tournament_id', t.id)
              .eq('player_id', user.id)
              .single();
            if (userRegError && userRegError.code !== 'PGRST116') console.error("Error fetching user registration:", userRegError);
            isRegistered = !!userReg;
          }

          return {
            ...t,
            total_registered_players: registeredCount || 0,
            is_user_registered: isRegistered,
          };
        })
      );
      setTournaments(tournamentsWithDetails as Tournament[]);
    } catch (error: any) {
      showError(error.message || "Erro ao carregar torneios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchTournaments();
    }
  }, [authLoading, user?.id]);

  const handleFormSubmit = async (data: TournamentFormData) => {
    if (!isAdmin) {
      showError("Você não tem permissão para criar ou editar torneios.");
      return;
    }
    setLoading(true);
    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`).toISOString();

      const tournamentData = {
        name: data.name,
        type: data.type,
        num_teams: parseInt(data.numTeams, 10),
        num_players_per_team: parseInt(data.numPlayersPerTeam, 10),
        num_groups: data.type === 'campeonato' && data.numGroups ? parseInt(data.numGroups, 10) : null,
        regulations: data.regulations || null,
        arena_id: data.arenaId ? parseInt(data.arenaId, 10) : null,
        start_date: startDateTime,
        created_by: user?.id,
        status: 'draft',
        has_enrollment_fee: data.hasEnrollmentFee,
        enrollment_fee_amount: data.hasEnrollmentFee && data.enrollmentFeeAmount ? parseFloat(data.enrollmentFeeAmount) : 0,
        pix_info: data.hasEnrollmentFee ? data.pixInfo || null : null,
      };

      if (editingTournament) {
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', editingTournament.id);
        if (error) throw error;
        showSuccess("Torneio atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('tournaments')
          .insert(tournamentData);
        if (error) throw error;
        showSuccess("Torneio criado com sucesso!");
      }
      
      setIsFormDialogOpen(false);
      setEditingTournament(null);
      fetchTournaments();
    } catch (error: any) {
      showError(error.message || "Erro ao salvar torneio.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTournament(null);
    setIsFormDialogOpen(true);
  };

  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingTournaments = filteredTournaments.filter(t => 
    t.status !== 'finished' && t.status !== 'cancelled'
  ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const finishedTournaments = filteredTournaments.filter(t => 
    t.status === 'finished' || t.status === 'cancelled'
  ).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrophyIcon className="h-6 w-6" />
            Torneios
          </h1>
          {isAdmin && (
            <Button onClick={openCreateDialog} variant="secondary" className="text-primary">
              <PlusIcon className="mr-2 h-4 w-4" />
              Novo Torneio
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar torneios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {upcomingTournaments.length === 0 && finishedTournaments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum torneio encontrado.</p>
            {isAdmin && (
              <Button onClick={openCreateDialog} className="mt-4">
                <PlusIcon className="mr-2 h-4 w-4" />
                Criar o primeiro torneio
              </Button>
            )}
          </div>
        ) : (
          <>
            {upcomingTournaments.length > 0 && (
              <>
                <h2 className="text-2xl font-bold mb-4">Próximos Torneios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {upcomingTournaments.map(tournament => (
                    <TournamentCard key={tournament.id} tournament={tournament} onRegistrationChange={fetchTournaments} />
                  ))}
                </div>
              </>
            )}

            {finishedTournaments.length > 0 && (
              <div className="mt-12">
                <Separator className="my-8" />
                <h2 className="text-2xl font-bold mb-6">Torneios Finalizados</h2>
                <div className="space-y-4">
                  {finishedTournaments.map((tournament) => (
                    <Card key={tournament.id} className="flex items-center justify-between p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <div className="font-medium">{tournament.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Início: {format(new Date(tournament.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          Status: {tournament.status === 'finished' ? 'Finalizado' : 'Cancelado'}
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/torneios/${tournament.id}`}>Ver Detalhes</Link>
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTournament ? "Editar Torneio" : "Criar Novo Torneio"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <TournamentForm
              tournament={editingTournament ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormDialogOpen(false)}
              isSubmitting={loading}
            />
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" form="tournament-form" disabled={loading}>
              {loading ? (editingTournament ? "Salvando..." : "Criando...") : (editingTournament ? "Atualizar" : "Criar Torneio")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TorneiosPage;