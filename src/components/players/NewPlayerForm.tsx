"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";

const newPlayerSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export type NewPlayerFormData = z.infer<typeof newPlayerSchema>;

interface NewPlayerFormProps {
  onSubmit: (data: NewPlayerFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const NewPlayerForm = ({ onSubmit, onCancel, isSubmitting }: NewPlayerFormProps) => {
  const form = useForm<NewPlayerFormData>({
    resolver: zodResolver(newPlayerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome Completo</FormLabel>
            <FormControl><Input placeholder="Nome do jogador" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone</FormLabel>
            <FormControl><Input type="tel" placeholder="(71) 91234-5678" {...field} onChange={handlePhoneChange} maxLength={15} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adicionando..." : "Adicionar Jogador"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default NewPlayerForm;