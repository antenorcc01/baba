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
import { UploadIcon } from "lucide-react";

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

interface ArenaFormProps {
  arena?: Arena;
  onSubmit: (data: ArenaFormData, file?: File) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ArenaForm = ({ arena, onSubmit, onCancel, isSubmitting }: ArenaFormProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);

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

  const handleFormSubmit = (data: ArenaFormData) => {
    onSubmit(data, selectedFile);
  };

  return (
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (arena ? "Atualizando..." : "Adicionando...") : (arena ? "Atualizar" : "Adicionar")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ArenaForm;