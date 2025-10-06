"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";

interface Player {
  id: string;
  full_name: string;
  type: 'player' | 'guest';
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

const selectMatchTeamsSchema = z.object({
  team1Name: z.string().min(1, "Time 1 é obrigatório"),
  team2Name: z.string().min(1, "Time 2 é obrigatório"),
}).refine(data => data.team1Name !== data.team2Name, {
  message: "Os times não podem ser os mesmos.",
  path: ["team2Name"],
});

type SelectMatchTeamsFormData = z.infer<typeof selectMatchTeamsSchema>;

interface SelectMatchTeamsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  gameId: number;
  generatedTeams: Team[] | null;
  lastCompletedMatch: GameMatch | null;
  defaultMatchDurationMinutes: number;
  defaultMatchWinGoals: number;
  onMatchCreated: () => void;
}

const SelectMatchTeamsDialog = ({
  isOpen,
  onOpenChange,
  gameId,
  generatedTeams,
  lastCompletedMatch,
  defaultMatchDurationMinutes,
  defaultMatchWinGoals,
  onMatchCreated,
}: SelectMatchTeamsDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SelectMatchTeamsFormData>({
    resolver: zodResolver(selectMatchTeamsSchema),
    defaultValues: {
      team1Name: "",
      team2Name: "",
    },
  });

  useEffect(() => {
    if (isOpen && generatedTeams && generatedTeams.length >= 2) {
      let suggestedTeam1 = "";
      let suggestedTeam2 = "";

      if (lastCompletedMatch && lastCompletedMatch.winner_team_name) {
        suggestedTeam1 = lastCompletedMatch.winner_team_name;
        
        // Find a team that is not the winner and not the loser of the last match
        const lastLoserName = lastCompletedMatch.team1_name === lastCompletedMatch.winner_team_name 
                              ? lastCompletedMatch.team2_name 
                              : lastCompletedMatch.team1_name;
        
        const availableForTeam2 = generatedTeams.filter(
          team => team.name !== suggestedTeam1 && team.name !== lastLoserName
        );

        if (availableForTeam2.length > 0) {
          // Simple rotation: pick the first available team
          suggestedTeam2 = availableForTeam2[0].name;
        } else if (generatedTeams.length >= 2) {
          // Fallback if only winner/loser are left, pick any other team
          const otherTeams = generatedTeams.filter(team => team.name !== suggestedTeam1);
          if (otherTeams.length > 0) {
            suggestedTeam2 = otherTeams[0].name;
          }
        }
      } else {
        // If no last match or no winner, pick the first two teams
        suggestedTeam1 = generatedTeams[0].name;
        suggestedTeam2 = generatedTeams[1].name;
      }

      form.reset({
        team1Name: suggestedTeam1,
        team2Name: suggestedTeam2,
      });
    } else if (isOpen) {
      form.reset({ team1Name: "", team2Name: "" });
    }
  }, [isOpen, generatedTeams, lastCompletedMatch, form]);

  const handleFormSubmit = async (data: SelectMatchTeamsFormData) => {
    setIsSubmitting(true);
    try {
      const nextMatchNumber = (lastCompletedMatch ? lastCompletedMatch.match_number + 1 : 1); // Simple increment for match number

      const { data: newMatch, error: insertError } = await supabase
        .from('game_matches')
        .insert({
          game_id: gameId,
          match_number: nextMatchNumber,
          team1_name: data.team1Name,
          team2_name: data.team2Name,
          duration_minutes: defaultMatchDurationMinutes,
          win_condition_goals: defaultMatchWinGoals,
          status: 'scheduled',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      showSuccess(`Partida ${nextMatchNumber} agendada com sucesso!`);
      onMatchCreated(); // Trigger refetch in parent
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      showError(error.message || "Erro ao agendar nova partida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const teamOptions = generatedTeams?.map(team => ({
    value: team.name,
    label: team.name,
  })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Nova Partida</DialogTitle>
          <DialogDescription>
            Selecione os times que jogarão na próxima partida.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="team1Name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time 1</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o primeiro time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="team2Name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time 2</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o segundo time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !generatedTeams || generatedTeams.length < 2}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  "Agendar Partida"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SelectMatchTeamsDialog;