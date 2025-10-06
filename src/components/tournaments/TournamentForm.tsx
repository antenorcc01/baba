"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

const tournamentSchema = z.object({
  name: z.string().min(1, "Nome do torneio é obrigatório"),
  type: z.enum(['copa', 'campeonato'], { message: "Tipo de torneio é obrigatório" }),
  numTeams: z.string().refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 2, "Número de times deve ser pelo menos 2"),
  numPlayersPerTeam: z.string().refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 1, "Número de jogadores por time deve ser pelo menos 1"),
  numGroups: z.string().optional().refine(val => {
    if (!val) return true; // Optional, so empty is fine
    const num = parseInt(val, 10);
    return !isNaN(num) && num >= 1;
  }, "Número de grupos deve ser pelo menos 1"),
  regulations: z.string().optional(),
  arenaId: z.string().optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  startTime: z.string().min(1, "Hora de início é obrigatória"),
  hasEnrollmentFee: z.boolean().default(false),
  enrollmentFeeAmount: z.string().optional().refine(val => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Valor da taxa de inscrição deve ser um número válido e não negativo."),
  pixInfo: z.string().optional(),
});

export type TournamentFormData = z.infer<typeof tournamentSchema>;

export interface Tournament {
  id: string;
  name: string;
  type: 'copa' | 'campeonato';
  status: 'draft' | 'registration_open' | 'group_stage' | 'knockout_stage' | 'finished' | 'cancelled';
  num_teams: number;
  num_players_per_team: number;
  num_groups?: number | null;
  regulations?: string | null;
  arena_id?: number | null;
  start_date: string;
  start_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  has_enrollment_fee?: boolean;
  enrollment_fee_amount?: number;
  pix_info?: string | null;
}

interface Arena {
  id: number;
  name: string;
}

interface TournamentFormProps {
  tournament?: Tournament;
  onSubmit: (data: TournamentFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const TournamentForm = ({ tournament, onSubmit, onCancel, isSubmitting }: TournamentFormProps) => {
  const { user } = useAuth();
  const [arenas, setArenas] = useState<Arena[]>([]);

  const form = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: tournament ? {
      name: tournament.name,
      type: tournament.type,
      numTeams: tournament.num_teams.toString(),
      numPlayersPerTeam: tournament.num_players_per_team.toString(),
      numGroups: tournament.num_groups?.toString() || "",
      regulations: tournament.regulations || "",
      arenaId: tournament.arena_id?.toString() || "",
      startDate: tournament.start_date.split('T')[0],
      startTime: tournament.start_date.split('T')[1].substring(0, 5),
      hasEnrollmentFee: tournament.has_enrollment_fee || false,
      enrollmentFeeAmount: tournament.enrollment_fee_amount?.toFixed(2) || "",
      pixInfo: tournament.pix_info || "",
    } : {
      name: "",
      type: 'copa',
      numTeams: "4",
      numPlayersPerTeam: "5",
      numGroups: "",
      regulations: "",
      arenaId: "",
      startDate: "",
      startTime: "",
      hasEnrollmentFee: false,
      enrollmentFeeAmount: "",
      pixInfo: "",
    },
  });

  const tournamentType = form.watch('type');
  const hasEnrollmentFee = form.watch('hasEnrollmentFee');

  useEffect(() => {
    if (tournamentType === 'copa') {
      form.setValue('numGroups', '');
    }
  }, [tournamentType, form]);

  useEffect(() => {
    const fetchArenas = async () => {
      const { data, error } = await supabase
        .from('arenas')
        .select('id, name')
        .order('name');
      if (error) {
        console.error("Error fetching arenas:", error);
      } else {
        setArenas(data || []);
      }
    };
    fetchArenas();
  }, []);

  return (
    <Form {...form}>
      <form id="tournament-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Torneio</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Copa Verão 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Torneio</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="copa">Copa (Mata-Mata)</SelectItem>
                  <SelectItem value="campeonato">Campeonato (Grupos + Mata-Mata)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="numTeams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Times</FormLabel>
              <FormControl>
                <Input type="number" placeholder="4" min="2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="numPlayersPerTeam"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jogadores por Time</FormLabel>
              <FormControl>
                <Input type="number" placeholder="5" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {tournamentType === 'campeonato' && (
          <FormField
            control={form.control}
            name="numGroups"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Grupos</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="arenaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local do Torneio (Arena)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a arena" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {arenas.map((arena) => (
                    <SelectItem key={arena.id} value={arena.id.toString()}>
                      {arena.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de Início</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="hasEnrollmentFee"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Taxa de Inscrição</FormLabel>
                <FormDescription>
                  Marque se este torneio exige uma taxa de inscrição.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {hasEnrollmentFee && (
          <>
            <FormField
              control={form.control}
              name="enrollmentFeeAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor da Taxa de Inscrição (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="50.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pixInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações PIX para Pagamento</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Chave PIX: 123.456.789-00 (CPF) - Nome: João Silva" rows={3} {...field} />
                  </FormControl>
                  <FormDescription>
                    Informe a chave PIX e outros detalhes relevantes para o pagamento da inscrição.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="regulations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regulamento do Torneio</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva as regras do torneio aqui..." rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default TournamentForm;