"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const gameSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  arenaId: z.string().min(1, "Arena é obrigatória"),
  maxPlayers: z.string().min(1, "Máximo de jogadores é obrigatório"),
  notes: z.string().optional(),
  defaultMatchDurationMinutes: z.string().refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, "Duração deve ser um número positivo"),
  defaultMatchWinGoals: z.string().refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0, "Gols para vitória deve ser um número não negativo"),
});

export type GameFormData = z.infer<typeof gameSchema>;

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

interface Arena {
  id: number;
  name: string;
  type: string;
  address: string;
  price: number;
  image_url?: string;
}

interface GameFormProps {
  game?: Game;
  onSubmit: (data: GameFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const GameForm = ({ game, onSubmit, onCancel, isSubmitting }: GameFormProps) => {
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<GameFormData>({
    resolver: zodResolver(gameSchema),
    defaultValues: game ? {
      date: game.game_date.split('T')[0],
      time: new Date(game.game_date).toTimeString().slice(0, 5),
      arenaId: game.arenas?.id.toString() || "",
      maxPlayers: game.max_players.toString(),
      notes: game.notes || "",
      defaultMatchDurationMinutes: game.default_match_duration_minutes?.toString() || "10",
      defaultMatchWinGoals: game.default_match_win_goals?.toString() || "2",
    } : {
      date: "",
      time: "",
      arenaId: "",
      maxPlayers: "22",
      notes: "",
      defaultMatchDurationMinutes: "10",
      defaultMatchWinGoals: "2",
    },
  });

  useEffect(() => {
    const fetchArenas = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('arenas')
          .select('*')
          .order('name');

        if (error) throw error;
        setArenas(data || []);
      } catch (error) {
        console.error('Error fetching arenas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArenas();
  }, []);

  useEffect(() => {
    if (game) {
      form.reset({
        date: game.game_date.split('T')[0],
        time: new Date(game.game_date).toTimeString().slice(0, 5),
        arenaId: game.arenas?.id.toString() || "",
        maxPlayers: game.max_players.toString(),
        notes: game.notes || "",
        defaultMatchDurationMinutes: game.default_match_duration_minutes?.toString() || "10",
        defaultMatchWinGoals: game.default_match_win_goals?.toString() || "2",
      });
    }
  }, [game, form]);

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "quadra":
        return <Badge className="bg-[#0077B6]">Quadra</Badge>;
      case "society":
        return <Badge className="bg-[#FFC300] text-[#212529]">Society</Badge>;
      case "campo":
        return <Badge className="bg-[#28A745]">Campo</Badge>;
      default:
        return <Badge variant="secondary">Outro</Badge>;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horário</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="arenaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Arena</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a arena" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {arenas.map((arena) => (
                    <SelectItem key={arena.id} value={arena.id.toString()}>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(arena.type)}
                        <span>{arena.name}</span>
                      </div>
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
          name="maxPlayers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Máximo de jogadores</FormLabel>
              <FormControl>
                <Input type="number" placeholder="22" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMatchDurationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duração Padrão da Partida (minutos)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="10" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMatchWinGoals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gols para Finalizar a Partida</FormLabel>
              <FormControl>
                <Input type="number" placeholder="2" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: Levar coletes azuis e brancos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (game ? "Atualizando..." : "Criando...") : (game ? "Atualizar" : "Criar")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default GameForm;