"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SendIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const sendMessageSchema = z.object({
  recipientType: z.enum(["all_players", "all_mensalistas", "all_diaristas", "specific_player", "specific_guest"], {
    message: "Tipo de destinatário é obrigatório",
  }),
  specificRecipientId: z.string().optional(),
  messageContent: z.string().min(1, "A mensagem não pode ser vazia"),
  channel: z.enum(["whatsapp", "sms"], {
    message: "Canal de envio é obrigatório",
  }),
});

type SendMessageFormData = z.infer<typeof sendMessageSchema>;

interface Profile {
  id: string;
  full_name: string;
  is_mensalista: boolean;
  payment_status: string;
}

interface GuestPlayer {
  id: number;
  full_name: string;
}

const SendMessageForm = () => {
  const [allPlayers, setAllPlayers] = useState<Profile[]>([]);
  const [allGuests, setAllGuests] = useState<GuestPlayer[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SendMessageFormData>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      recipientType: "all_players",
      specificRecipientId: "",
      messageContent: "",
      channel: "whatsapp",
    },
  });

  const recipientType = form.watch("recipientType");

  useEffect(() => {
    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, is_mensalista, payment_status')
          .eq('is_deleted', false)
          .eq('is_suspended', false)
          .order('full_name');
        if (profilesError) throw profilesError;
        setAllPlayers(profiles || []);

        const { data: guests, error: guestsError } = await supabase
          .from('guest_players')
          .select('id, full_name')
          .eq('is_deleted', false)
          .eq('is_suspended', false)
          .order('full_name');
        if (guestsError) throw guestsError;
        setAllGuests(guests || []);

      } catch (error: any) {
        showError(error.message || "Erro ao carregar lista de jogadores/convidados.");
      } finally {
        setLoadingRecipients(false);
      }
    };
    fetchRecipients();
  }, []);

  const onSubmit = async (data: SendMessageFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-custom-message', {
        body: {
          recipientType: data.recipientType,
          specificRecipientId: data.specificRecipientId,
          messageContent: data.messageContent,
          channel: data.channel,
        },
      });

      if (error) throw error;
      showSuccess("Mensagem enviada com sucesso!");
      form.reset();
    } catch (error: any) {
      showError(error.message || "Erro ao enviar mensagem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSpecificRecipientOptions = () => {
    const options: { value: string; label: string }[] = [];
    allPlayers.forEach(p => options.push({ value: `profile-${p.id}`, label: `${p.full_name} (Jogador)` }));
    allGuests.forEach(g => options.push({ value: `guest-${g.id}`, label: `${g.full_name} (Convidado)` }));
    return options.sort((a, b) => a.label.localeCompare(b.label));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="recipientType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enviar para</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de destinatário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all_players">Todos os Jogadores Registrados</SelectItem>
                  <SelectItem value="all_mensalistas">Todos os Mensalistas</SelectItem>
                  <SelectItem value="all_diaristas">Todos os Diaristas</SelectItem>
                  <SelectItem value="specific_player">Jogador Específico</SelectItem>
                  <SelectItem value="specific_guest">Convidado Específico</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {(recipientType === "specific_player" || recipientType === "specific_guest") && (
          <FormField
            control={form.control}
            name="specificRecipientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selecionar Destinatário</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={loadingRecipients}>
                      <SelectValue placeholder="Selecione um jogador ou convidado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingRecipients ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : (
                      getSpecificRecipientOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="messageContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem</FormLabel>
              <FormControl>
                <Textarea placeholder="Digite sua mensagem aqui..." rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Canal de Envio</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <SendIcon className="mr-2 h-4 w-4" />
              Enviar Mensagem
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default SendMessageForm;