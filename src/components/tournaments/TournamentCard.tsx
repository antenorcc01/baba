"use client";

import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UsersIcon, TrophyIcon, DollarSignIcon } from "lucide-react"; // Importar DollarSignIcon
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { useState } from "react";

export interface Tournament {
  id: string;
  name: string;
  type: 'copa' | 'campeonato';
  status: 'draft' | 'registration_open' | 'group_stage' | 'knockout_stage' | 'finished' | 'cancelled';
  num_teams: number;
  num_players_per_team: number;
  num_groups?: number | null;
  created_at: string;
  start_date: string;
  total_registered_players: number;
  is_user_registered: boolean;
  has_enrollment_fee?: boolean; // Novo campo
  enrollment_fee_amount?: number; // Novo campo
  user_registration_status?: 'pendente' | 'pago' | 'isento'; // Novo campo
}

interface TournamentCardProps {
  tournament: Tournament;
  onRegistrationChange: () => void;
}

const TournamentCard = ({ tournament, onRegistrationChange }: TournamentCardProps) => {
  const { user, profile, isSuspended } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>;
      case 'registration_open': return <Badge className="bg-green-500 text-white">Inscrições Abertas</Badge>;
      case 'group_stage': return <Badge className="bg-blue-500 text-white">Fase de Grupos</Badge>;
      case 'knockout_stage': return <Badge className="bg-purple-500 text-white">Mata-Mata</Badge>;
      case 'finished': return <Badge variant="outline">Finalizado</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelado</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getTypeBadge = (type: Tournament['type']) => {
    switch (type) {
      case 'copa': return <Badge className="bg-yellow-500 text-black">Copa</Badge>;
      case 'campeonato': return <Badge className="bg-orange-500 text-white">Campeonato</Badge>;
      default: return <Badge variant="secondary">Tipo Desconhecido</Badge>;
    }
  };

  const handleRegisterToggle = async () => {
    if (!user || !profile) {
      showError("Você precisa estar logado para se inscrever.");
      return;
    }
    if (isSuspended) {
      showError("Você está suspenso e não pode se inscrever em torneios.");
      return;
    }
    if (tournament.status !== 'draft' && tournament.status !== 'registration_open') {
      showError("As inscrições para este torneio não estão abertas.");
      return;
    }

    setIsRegistering(true);
    try {
      if (tournament.is_user_registered) {
        // Unregister
        const { error } = await supabase
          .from('tournament_registrations')
          .delete()
          .eq('tournament_id', tournament.id)
          .eq('player_id', user.id);
        if (error) throw error;
        showSuccess("Inscrição cancelada com sucesso!");
      } else {
        // Register
        const { error } = await supabase
          .from('tournament_registrations')
          .insert({
            tournament_id: tournament.id,
            player_id: user.id,
            payment_status: tournament.has_enrollment_fee ? 'pendente' : 'isento', // Definir status de pagamento
            enrollment_fee_paid: tournament.has_enrollment_fee ? tournament.enrollment_fee_amount : 0, // Registrar valor
          });
        if (error) throw error;
        showSuccess("Inscrição realizada com sucesso!");
      }
      onRegistrationChange(); // Notify parent to refetch
    } catch (err: any) {
      showError(err.message || "Erro ao gerenciar inscrição.");
    } finally {
      setIsRegistering(false);
    }
  };

  const maxPlayersLimit = tournament.num_teams * tournament.num_players_per_team;
  const isRegistrationOpen = tournament.status === 'draft' || tournament.status === 'registration_open';
  const isFull = tournament.total_registered_players >= maxPlayersLimit;
  const canRegister = isRegistrationOpen && !isSuspended && !tournament.is_user_registered && !isFull;
  const canUnregister = isRegistrationOpen && !isSuspended && tournament.is_user_registered;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-xl">{tournament.name}</CardTitle>
          {getStatusBadge(tournament.status)}
        </div>
        <CardDescription className="flex items-center gap-2">
          <TrophyIcon className="h-4 w-4 text-muted-foreground" />
          {getTypeBadge(tournament.type)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span>Início: {format(new Date(tournament.start_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4" />
          <span>{tournament.total_registered_players} inscritos / {maxPlayersLimit} vagas</span>
        </div>
        {tournament.type === 'campeonato' && tournament.num_groups && (
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-4 w-4" />
            <span>{tournament.num_groups} grupos</span>
          </div>
        )}
        {tournament.has_enrollment_fee && (
          <div className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            <span>Taxa de Inscrição: R$ {tournament.enrollment_fee_amount?.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {user && (
          canUnregister ? (
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
          ) : (
            <Button
              className="w-full"
              onClick={handleRegisterToggle}
              disabled={isRegistering || !canRegister}
            >
              {isRegistering ? "Inscrevendo..." : "Inscrever-se"}
            </Button>
          )
        )}
        <Button asChild variant="secondary" className="w-full">
          <Link to={`/torneios/${tournament.id}`}>Ver Detalhes</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TournamentCard;