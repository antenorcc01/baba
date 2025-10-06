"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { StarIcon, GoalIcon } from "lucide-react"; // Adicionado GoalIcon
import { useAuth } from "@/contexts/AuthContext"; // Importar useAuth

const guestPlayerSchema = z.object({
  full_name: z.string().min(1, "Nome completo é obrigatório"),
  phone: z.string().optional(),
  player_type: z.string().optional(),
  invited_by: z.string().optional(),
  skill_level: z.string().optional(), // Renomeado para skill_level
  total_goals: z.number().optional(), // Adicionado total_goals
});

export type GuestPlayerFormData = z.infer<typeof guestPlayerSchema>;

export interface GuestPlayer {
  id: number;
  full_name: string;
  phone?: string | null;
  player_type?: string | null;
  invited_by?: string | null;
  is_deleted?: boolean;
  updated_at?: string;
  skill_level?: number;
  total_goals?: number; // Adicionado total_goals
}

interface Profile {
  id: string;
  full_name: string;
}

interface GuestPlayerFormProps {
  guest?: GuestPlayer;
  onSubmit: (data: GuestPlayerFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isAdmin: boolean;
}

const renderSkillStarsInput = (currentLevel: number, onSelect: (level: number) => void) => {
  const stars = [];
  for (let i = 1; i <= 3; i++) {
    stars.push(
      <StarIcon 
        key={i} 
        className={`h-6 w-6 cursor-pointer ${i <= currentLevel ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
        onClick={() => onSelect(i)}
      />
    );
  }
  return <div className="flex items-center gap-1">{stars}</div>;
};

const GuestPlayerForm = ({ guest, onSubmit, onCancel, isSubmitting, isAdmin }: GuestPlayerFormProps) => {
  const [registeredPlayers, setRegisteredPlayers] = useState<Profile[]>([]);
  const { isAdmin: authIsAdmin } = useAuth(); // Obter isAdmin do contexto de autenticação

  const form = useForm<GuestPlayerFormData>({
    resolver: zodResolver(guestPlayerSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      player_type: "",
      invited_by: "",
      skill_level: "1", // Renomeado para skill_level
      total_goals: 0, // Default para total_goals
    },
  });

  useEffect(() => {
    const fetchRegisteredPlayers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_deleted', false)
        .order('full_name');
      
      if (error) {
        console.error("Error fetching registered players:", error);
        setRegisteredPlayers([]);
      } else {
        setRegisteredPlayers(data || []);
      }
    };
    fetchRegisteredPlayers();
  }, []);

  useEffect(() => {
    if (guest && registeredPlayers.length > 0) {
      form.reset({
        full_name: guest.full_name,
        phone: guest.phone || "",
        player_type: guest.player_type || "",
        invited_by: guest.invited_by || "",
        skill_level: guest.skill_level?.toString() || "1", // Renomeado para skill_level
        total_goals: guest.total_goals || 0, // Carregar total_goals
      });
    } else if (!guest) {
      form.reset({
        full_name: "",
        phone: "",
        player_type: "",
        invited_by: "",
        skill_level: "1", // Renomeado para skill_level
        total_goals: 0, // Default para total_goals
      });
    }
  }, [guest, form, registeredPlayers]);

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    form.setValue('phone', formattedValue);
  };

  const handleFormSubmit = (data: GuestPlayerFormData) => {
    const submissionData: any = {
      full_name: data.full_name,
      phone: data.phone?.replace(/\D/g, "") || null,
      player_type: data.player_type || null,
      invited_by: data.invited_by || null,
      skill_level: parseInt(data.skill_level || "1", 10), // Usando data.skill_level e convertendo para número
    };
    
    console.log("Submitting guest data from form:", submissionData);
    console.log("isAdmin status from AuthContext:", authIsAdmin);

    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do convidado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone (opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="(71) 91234-5678"
                  {...field}
                  onChange={handlePhoneChange}
                  maxLength={15}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="player_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Posição Preferencial (opcional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma posição" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="linha">Linha</SelectItem>
                  <SelectItem value="goleiro">Goleiro</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isAdmin && (
          <FormField
            control={form.control}
            name="skill_level" // Renomeado para skill_level
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nível de Habilidade</FormLabel>
                <FormControl>
                  {renderSkillStarsInput(parseInt(field.value || "1"), (level) => field.onChange(level.toString()))}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isAdmin && (
          <FormField
            control={form.control}
            name="invited_by"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Convidado por (opcional)</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ''}
                  key={guest?.id || 'new-guest'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione quem convidou" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {registeredPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isAdmin && (
          <FormField
            control={form.control}
            name="total_goals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gols Marcados</FormLabel>
                <FormControl>
                  <Input type="number" {...field} readOnly disabled={!isAdmin} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <DialogFooter className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (guest ? "Salvando..." : "Adicionando...") : (guest ? "Salvar" : "Adicionar")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default GuestPlayerForm;