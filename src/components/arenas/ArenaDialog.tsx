"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UploadIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const arenaSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  price: z.string().min(1, "Valor por hora é obrigatório"),
});

export type ArenaFormData = z.infer<typeof arenaSchema>;

export interface Arena {
  id: number;
  name: string;
  type: string;
  address: string;
  price: number;
  image_url?: string;
  created_at: string;
}

interface ArenaDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  arena?: Arena;
  onSuccess: () => void;
}

const ArenaDialog = ({ isOpen, onOpenChange, arena, onSuccess }: ArenaDialogProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ArenaFormData>({
    resolver: zodResolver(arenaSchema),
    defaultValues: {
      name: "",
      type: "",
      address: "",
      price: "",
    },
  });

  useEffect(() => {
    if (arena) {
      form.reset({
        name: arena.name,
        type: arena.type,
        address: arena.address,
        price: arena.price.toString(),
      });
      setImagePreview(arena.image_url || null);
    } else {
      form.reset({
        name: "",
        type: "",
        address: "",
        price: "",
      });
      setImagePreview(null);
    }
    setSelectedFile(undefined);
  }, [arena, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: ArenaFormData) => {
    setIsSubmitting(true);
    try {
      let imageUrl = arena?.image_url;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${arena?.id || Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('arenas')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('arenas')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const priceValue = parseFloat(data.price);

      if (arena) {
        const { error } = await supabase
          .from('arenas')
          .update({
            name: data.name,
            type: data.type,
            address: data.address,
            price: priceValue,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', arena.id);

        if (error) throw error;
        showSuccess("Arena atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from('arenas')
          .insert({
            name: data.name,
            type: data.type,
            address: data.address,
            price: priceValue,
            image_url: imageUrl,
          });

        if (error) throw error;
        showSuccess("Arena adicionada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "Erro ao salvar arena.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{arena ? "Editar Arena" : "Adicionar Nova Arena"}</DialogTitle>
          <DialogDescription>
            {arena ? "Atualize as informações da arena." : "Preencha os detalhes para criar uma nova arena."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Arena</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Quadra do Zé" {...field} />
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
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="quadra">Quadra</SelectItem>
                      <SelectItem value="society">Society</SelectItem>
                      <SelectItem value="campo">Campo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua das Palmeiras, 123 - Salvador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor por hora (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="150" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Imagem da Arena</FormLabel>
              <div className="flex items-center gap-4">
                <img 
                  src={imagePreview || "/placeholder.svg"} 
                  alt="Preview da Arena" 
                  className="w-24 h-24 object-cover rounded-md border bg-gray-100"
                />
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" asChild>
                    <Label htmlFor="arena-image-upload" className="cursor-pointer">
                      <UploadIcon className="h-4 w-4 mr-2" />
                      {imagePreview ? "Alterar Imagem" : "Enviar Imagem"}
                    </Label>
                  </Button>
                  <Input 
                    id="arena-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG até 5MB.</p>
                </div>
              </div>
            </FormItem>
            
            <DialogFooter className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (arena ? "Atualizando..." : "Adicionando...") : (arena ? "Atualizar" : "Adicionar")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ArenaDialog;