"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GameForm, { GameFormData } from "@/components/games/GameForm";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Game {
  id: number;
  game_date: string;
  status: string;
  max_players: number;
  notes?: string;
  created_at: string;
  arenas: {
    id: number;
    name: string;
    address: string;
  };
  default_match_duration_minutes?: number;
  default_match_win_goals?: number;
}

interface GameDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  game?: Game;
}

const GameDialog = ({ isOpen, onOpenChange, game }: GameDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { gameTermSingular } = useAuth();

  const handleFormSubmit = async (data: GameFormData) => {
    setIsSubmitting(true);
    try {
      const gameDate = new Date(`${data.date}T${data.time}`);
      
      const gameData = {
        game_date: gameDate.toISOString(),
        arena_id: parseInt(data.arenaId, 10),
        max_players: parseInt(data.maxPlayers, 10),
        notes: data.notes,
        status: 'Agendado',
        default_match_duration_minutes: parseInt(data.defaultMatchDurationMinutes, 10),
        default_match_win_goals: parseInt(data.defaultMatchWinGoals, 10),
      };

      let error;
      if (game) {
        const { error: updateError } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', game.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('games')
          .insert(gameData);
        error = insertError;
      }

      if (error) throw error;

      showSuccess(game ? `${gameTermSingular} atualizado com sucesso!` : `${gameTermSingular} agendado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["games"] });
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || (game ? `Erro ao atualizar o ${gameTermSingular.toLowerCase()}.` : `Erro ao agendar o ${gameTermSingular.toLowerCase()}.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{game ? `Editar ${gameTermSingular}` : `Agendar Novo ${gameTermSingular}`}</DialogTitle>
          <DialogDescription>
            {game ? `Edite as informações do ${gameTermSingular.toLowerCase()}.` : `Preencha os detalhes para criar um novo ${gameTermSingular.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <GameForm
          game={game}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default GameDialog;