"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, EditIcon, XCircle, SaveIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Team {
  id: string;
  name: string;
}

interface Arena {
  id: number;
  name: string;
}

export interface Match {
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

interface TournamentMatchCardProps {
  match: Match;
  teams: Team[];
  arenas: Arena[];
  onUpdate: () => void; // Callback to refetch matches after update
}

const TournamentMatchCard = ({ match, teams, arenas, onUpdate }: TournamentMatchCardProps) => {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [score1, setScore1] = useState<string>(match.score1?.toString() || "");
  const [score2, setScore2] = useState<string>(match.score2?.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setScore1(match.score1?.toString() || "");
    setScore2(match.score2?.toString() || "");
  }, [match]);

  const getTeamNameById = (teamId: string | null) => {
    return teams.find(t => t.id === teamId)?.name || "A definir";
  };

  const getArenaNameById = (arenaId: number | null) => {
    return arenas.find(a => a.id === arenaId)?.name || "A definir";
  };

  const handleSaveResult = async () => {
    if (!isAdmin) {
      showError("Você não tem permissão para editar resultados.");
      return;
    }
    if (!match.team1_id || !match.team2_id) {
      showError("Ambos os times devem estar definidos para registrar um resultado.");
      return;
    }

    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      showError("Por favor, insira pontuações válidas.");
      return;
    }

    let winnerTeamId: string | null = null;
    if (s1 > s2) {
      winnerTeamId = match.team1_id;
    } else if (s2 > s1) {
      winnerTeamId = match.team2_id;
    } else {
      // Empate, pode ser necessário regra de desempate ou permitir empate
      showError("Empates não são permitidos em mata-mata. Por favor, insira um vencedor.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          score1: s1,
          score2: s2,
          winner_team_id: winnerTeamId,
          status: 'completed',
          // Removido: arena_id, match_date não serão atualizados aqui
        })
        .eq('id', match.id);

      if (error) throw error;
      showSuccess("Resultado da partida salvo com sucesso!");
      setIsEditing(false);
      onUpdate(); // Trigger refetch in parent
    } catch (error: any) {
      showError(error.message || "Erro ao salvar o resultado da partida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMatchCompleted = match.status === 'completed';
  const winnerName = getTeamNameById(match.winner_team_id);
  const currentArenaName = getArenaNameById(match.arena_id);

  return (
    <Card className="border rounded-lg p-3 bg-card shadow-sm">
      {isEditing && isAdmin ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <Label htmlFor={`score1-${match.id}`} className="font-medium">{getTeamNameById(match.team1_id)}</Label>
            <Input
              id={`score1-${match.id}`}
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-16 text-right"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Label htmlFor={`score2-${match.id}`} className="font-medium">{getTeamNameById(match.team2_id)}</Label>
            <Input
              id={`score2-${match.id}`}
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-16 text-right"
            />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveResult} disabled={isSubmitting}>
              <SaveIcon className="h-4 w-4 mr-2" /> {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{getTeamNameById(match.team1_id)}</span>
            <span className="font-bold">{match.score1 !== null ? match.score1 : '-'}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="font-medium">{getTeamNameById(match.team2_id)}</span>
            <span className="font-bold">{match.score2 !== null ? match.score2 : '-'}</span>
          </div>
          {match.match_date && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(new Date(match.match_date), 'dd/MM HH:mm', { locale: ptBR })}</span>
            </div>
          )}
          {match.arena_id && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              <span>{currentArenaName}</span>
            </div>
          )}
          {isMatchCompleted && match.winner_team_id && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>Vencedor:</span>
              <span className="font-semibold text-primary">{winnerName}</span>
            </div>
          )}
          {isAdmin && !isMatchCompleted && (
            <div className="flex justify-end mt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <EditIcon className="h-4 w-4 mr-2" /> Inserir Resultado
              </Button>
            </div>
          )}
          {isAdmin && isMatchCompleted && (
            <div className="flex justify-end mt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <EditIcon className="h-4 w-4 mr-2" /> Editar Resultado
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TournamentMatchCard;