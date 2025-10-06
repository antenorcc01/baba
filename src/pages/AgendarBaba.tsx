"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GameForm, { GameFormData } from "@/components/games/GameForm";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const AgendarBaba = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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

      const { error } = await supabase
        .from('games')
        .insert(gameData);

      if (error) throw error;

      showSuccess("Baba agendado com sucesso!");
      navigate("/babas");
    } catch (error: any) {
      showError(error.message || "Erro ao agendar o baba.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/babas");
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Agendar Novo Baba</CardTitle>
          <CardDescription>Preencha os detalhes para criar um novo baba.</CardDescription>
        </CardHeader>
        <CardContent>
          <GameForm
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AgendarBaba;