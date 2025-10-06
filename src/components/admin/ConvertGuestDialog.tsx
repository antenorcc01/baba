"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { GuestPlayer } from "@/components/players/GuestPlayerForm";

const convertSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type ConvertFormData = z.infer<typeof convertSchema>;

interface ConvertGuestDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  guest: GuestPlayer | null;
  onSuccess: () => void;
}

const ConvertGuestDialog = ({ isOpen, onOpenChange, guest, onSuccess }: ConvertGuestDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ConvertFormData>({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = async (data: ConvertFormData) => {
    if (!guest) return;
    setIsSubmitting(true);
    try {
      // Step 1: Call the Edge Function to create the new user
      const { error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          data: {
            full_name: guest.full_name,
            phone: guest.phone?.replace(/\D/g, "") || null,
            player_type: guest.player_type || null,
          },
        },
      });

      if (functionError) throw functionError;

      // Step 2: Permanently delete the guest player record
      const { error: deleteError } = await supabase
        .from('guest_players')
        .delete()
        .eq('id', guest.id);

      if (deleteError) {
        showError(`Usuário criado, mas falha ao excluir o registro de convidado: ${deleteError.message}`);
      } else {
        showSuccess(`Convidado "${guest.full_name}" convertido para jogador com sucesso!`);
      }
      
      onSuccess();
      onOpenChange(false);
      form.reset();

    } catch (error: any) {
      showError(error.message || "Erro ao converter convidado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Converter Convidado em Jogador</DialogTitle>
          <DialogDescription>
            Crie uma conta de jogador para <strong>{guest?.full_name}</strong>. O registro de convidado será excluído permanentemente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail do Jogador</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Provisória</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Convertendo..." : "Converter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertGuestDialog;