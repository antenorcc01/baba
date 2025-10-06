"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const paymentSchema = z.object({
  type: z.string().min(1, "O tipo é obrigatório"),
  category: z.string().min(1, "A categoria é obrigatória"),
  description: z.string().min(1, "A descrição é obrigatória"),
  amount: z.string().min(1, "O valor é obrigatório"),
  paymentDate: z.string().min(1, "A data é obrigatória").refine((date) => {
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate <= today;
  }, {
    message: "A data não pode ser no futuro.",
  }),
  playerId: z.string().optional(),
  arenaId: z.string().optional(),
  hours: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

export interface Payment {
  id: number;
  player_id?: string | null;
  guest_player_id?: number | null;
  description: string;
  amount: number;
  type: string;
  category: string;
  payment_date: string;
}

interface Player {
  id: string;
  full_name: string;
  is_mensalista: boolean;
}

interface GuestPlayer {
  id: number;
  full_name: string;
}

interface Arena {
  id: number;
  name: string;
  price: number;
}

interface PaymentFormProps {
  payment?: Payment;
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const PaymentForm = ({ payment, onSubmit, onCancel, isSubmitting }: PaymentFormProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [guests, setGuests] = useState<GuestPlayer[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [payerOptions, setPayerOptions] = useState<{ value: string; label: string }[]>([]);
  const [settings, setSettings] = useState({ monthlyFee: '50', dailyFee: '20' });
  const [lastGameDate, setLastGameDate] = useState<string | null>(null);
  
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: "",
      category: "",
      description: "",
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      playerId: "",
      arenaId: "",
      hours: "1",
    },
  });

  const transactionType = form.watch("type");
  const category = form.watch("category");
  const arenaId = form.watch("arenaId");
  const hours = form.watch("hours");

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: playersData, error: playersError } = await supabase.from('profiles').select('id, full_name, is_mensalista').order('full_name');
      if (!playersError) setPlayers(playersData);

      const { data: guestsData, error: guestsError } = await supabase.from('guest_players').select('id, full_name').eq('is_deleted', false).order('full_name');
      if (!guestsError) setGuests(guestsData);

      const { data: arenasData, error: arenasError } = await supabase.from('arenas').select('id, name, price').order('name');
      if (!arenasError) setArenas(arenasData);

      const { data: settingsData, error: settingsError } = await supabase.from('group_settings').select('setting_key, setting_value');
      if (!settingsError && settingsData) {
        const newSettings = settingsData.reduce((acc, setting) => {
          if (setting.setting_key === 'monthly_fee_amount') acc.monthlyFee = setting.setting_value;
          if (setting.setting_key === 'daily_fee_amount') acc.dailyFee = setting.setting_value;
          return acc;
        }, { monthlyFee: '50', dailyFee: '20' });
        setSettings(newSettings);
      }

      const { data: lastGameData, error: lastGameError } = await supabase
        .from('games')
        .select('game_date')
        .order('game_date', { ascending: false })
        .limit(1)
        .single();
      
      if (lastGameData) {
        const formattedDate = format(new Date(lastGameData.game_date), 'dd/MM');
        setLastGameDate(formattedDate);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (payment) {
      let payerId = "";
      if (payment.player_id) {
        payerId = `profile-${payment.player_id}`;
      } else if (payment.guest_player_id) {
        payerId = `guest-${payment.guest_player_id}`;
      }

      form.reset({
        type: payment.type,
        category: payment.category,
        description: payment.description,
        amount: payment.amount.toString(),
        paymentDate: payment.payment_date,
        playerId: payerId,
        arenaId: "",
        hours: "1",
      });
    } else {
      form.reset({
        type: "",
        category: "",
        description: "",
        amount: "",
        paymentDate: new Date().toISOString().split('T')[0],
        playerId: "",
        arenaId: "",
        hours: "1",
      });
    }
  }, [payment, form]);

  useEffect(() => {
    if (category === 'Mensalidade') {
      form.setValue('amount', settings.monthlyFee);
      const monthName = format(new Date(), 'LLLL', { locale: ptBR });
      form.setValue('description', `Mensalidade (${monthName.charAt(0).toUpperCase() + monthName.slice(1)})`);
      setPayerOptions(
        players
          .filter(p => p.is_mensalista)
          .map(p => ({ value: `profile-${p.id}`, label: p.full_name }))
      );
    } else if (category === 'Diária') {
      form.setValue('amount', settings.dailyFee);
      if (lastGameDate) {
        form.setValue('description', `Diária baba (${lastGameDate})`);
      } else {
        form.setValue('description', 'Diária baba');
      }
      const combined = [
        ...players.map(p => ({ value: `profile-${p.id}`, label: p.full_name })),
        ...guests.map(g => ({ value: `guest-${g.id}`, label: `${g.full_name} (Convidado)` }))
      ].sort((a, b) => a.label.localeCompare(b.label));
      setPayerOptions(combined);
    } else {
      setPayerOptions(players.map(p => ({ value: `profile-${p.id}`, label: p.full_name })));
    }
    form.setValue('playerId', '');
  }, [category, settings, form, lastGameDate, players, guests]);

  useEffect(() => {
    if (category === 'Arena' && arenaId && hours) {
      const selectedArena = arenas.find(a => a.id.toString() === arenaId);
      const numHours = parseFloat(hours);
      if (selectedArena && !isNaN(numHours) && numHours > 0) {
        const totalAmount = selectedArena.price * numHours;
        form.setValue('amount', totalAmount.toFixed(2));
        form.setValue('description', `Pagamento ${selectedArena.name} (${numHours}h)`);
      }
    }
  }, [arenaId, hours, category, arenas, form]);

  const categories = {
    Entrada: ["Mensalidade", "Diária", "Outro"],
    Saída: ["Arena", "Goleiro", "Material", "Outro"],
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transação</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {transactionType && (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories[transactionType as keyof typeof categories]?.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {category === 'Arena' && (
          <div className="space-y-4 p-4 border rounded-md">
            <FormField
              control={form.control}
              name="arenaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arena</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione a arena" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {arenas.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas</FormLabel>
                  <FormControl><Input type="number" step="0.5" min="0.5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {transactionType === "Entrada" && category !== 'Arena' && (
          <FormField
            control={form.control}
            name="playerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jogador</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione o jogador" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {payerOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl><Input placeholder="Ex: Mensalidade de Janeiro" {...field} readOnly={category === 'Arena'} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (R$)</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="50.00" {...field} readOnly={category === 'Arena'} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl><Input type="date" {...field} max={new Date().toISOString().split("T")[0]} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : (payment ? "Atualizar" : "Registrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentForm;