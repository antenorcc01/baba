"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const pixConfigSchema = z.object({
  pix_key_mensalista: z.string().min(1, "Chave PIX é obrigatória"),
  pix_qr_code_url_mensalista: z.string().optional(),
  pix_key_diarista: z.string().min(1, "Chave PIX é obrigatória"),
  pix_qr_code_url_diarista: z.string().optional(),
  beneficiary_name: z.string().min(1, "Nome do beneficiário é obrigatório"),
  beneficiary_document: z.string().min(1, "Documento é obrigatório"),
  bank_name: z.string().min(1, "Nome do banco é obrigatório"),
});

type PixConfigFormData = z.infer<typeof pixConfigSchema>;

interface PixConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

const PixConfigDialog = ({ isOpen, onOpenChange, onSuccess }: PixConfigDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensalistaFile, setMensalistaFile] = useState<File | undefined>();
  const [diaristaFile, setDiaristaFile] = useState<File | undefined>();
  const [mensalistaPreview, setMensalistaPreview] = useState<string | null>(null);
  const [diaristaPreview, setDiaristaPreview] = useState<string | null>(null);

  const form = useForm<PixConfigFormData>({
    resolver: zodResolver(pixConfigSchema),
    defaultValues: {
      pix_key_mensalista: "",
      pix_qr_code_url_mensalista: "",
      pix_key_diarista: "",
      pix_qr_code_url_diarista: "",
      beneficiary_name: "",
      beneficiary_document: "",
      bank_name: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchSettings = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.from('group_settings').select('setting_key, setting_value');
          if (error) throw error;

          const settings = data.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
          }, {} as Record<string, string>);

          form.reset({
            pix_key_mensalista: settings['pix_key_mensalista'] || "",
            pix_qr_code_url_mensalista: settings['pix_qr_code_url_mensalista'] || "",
            pix_key_diarista: settings['pix_key_diarista'] || "",
            pix_qr_code_url_diarista: settings['pix_qr_code_url_diarista'] || "",
            beneficiary_name: settings['beneficiary_name'] || "",
            beneficiary_document: settings['beneficiary_document'] || "",
            bank_name: settings['bank_name'] || "",
          });
          setMensalistaPreview(settings['pix_qr_code_url_mensalista'] || null);
          setDiaristaPreview(settings['pix_qr_code_url_diarista'] || null);
        } catch (err: any) {
          showError(err.message || "Erro ao carregar configurações PIX.");
        } finally {
          setLoading(false);
        }
      };
      fetchSettings();
    }
  }, [isOpen, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'mensalista' | 'diarista') => {
    const file = event.target.files?.[0];
    if (file) {
      const setFile = type === 'mensalista' ? setMensalistaFile : setDiaristaFile;
      const setPreview = type === 'mensalista' ? setMensalistaPreview : setDiaristaPreview;
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadQrCode = async (file: File, type: 'mensalista' | 'diarista'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `qrcode-${type}-${Date.now()}.${fileExt}`;
    const { error, data } = await supabase.storage.from('pix_qrcodes').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('pix_qrcodes').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleFormSubmit = async (data: PixConfigFormData) => {
    setIsSubmitting(true);
    try {
      let mensalistaUrl = form.getValues('pix_qr_code_url_mensalista');
      let diaristaUrl = form.getValues('pix_qr_code_url_diarista');

      if (mensalistaFile) {
        mensalistaUrl = await uploadQrCode(mensalistaFile, 'mensalista');
      }
      if (diaristaFile) {
        diaristaUrl = await uploadQrCode(diaristaFile, 'diarista');
      }

      const settingsToUpdate = [
        { setting_key: 'pix_key_mensalista', setting_value: data.pix_key_mensalista },
        { setting_key: 'pix_qr_code_url_mensalista', setting_value: mensalistaUrl || '' },
        { setting_key: 'pix_key_diarista', setting_value: data.pix_key_diarista },
        { setting_key: 'pix_qr_code_url_diarista', setting_value: diaristaUrl || '' },
        { setting_key: 'beneficiary_name', setting_value: data.beneficiary_name },
        { setting_key: 'beneficiary_document', setting_value: data.beneficiary_document },
        { setting_key: 'bank_name', setting_value: data.bank_name },
      ];

      const { error } = await supabase.from('group_settings').upsert(settingsToUpdate, { onConflict: 'setting_key' });
      if (error) throw error;

      showSuccess("Configurações PIX atualizadas com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "Erro ao salvar configurações.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQrCodeUploader = (type: 'mensalista' | 'diarista') => {
    const preview = type === 'mensalista' ? mensalistaPreview : diaristaPreview;
    const id = `qrcode-upload-${type}`;
    return (
      <FormItem>
        <FormLabel>QR Code</FormLabel>
        <div className="flex items-center gap-4">
          <img src={preview || "/placeholder.svg"} alt={`Preview QR Code ${type}`} className="w-24 h-24 object-cover rounded-md border bg-gray-100" />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" asChild>
              <Label htmlFor={id} className="cursor-pointer">
                <UploadIcon className="h-4 w-4 mr-2" />
                {preview ? "Alterar Imagem" : "Enviar Imagem"}
              </Label>
            </Button>
            <Input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, type)} />
            <p className="text-xs text-muted-foreground">PNG, JPG até 1MB.</p>
          </div>
        </div>
      </FormItem>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Dados de Pagamento PIX</DialogTitle>
          <DialogDescription>Estas informações serão exibidas na janela de pagamento para os jogadores.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <Tabs defaultValue="mensalista">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mensalista">PIX Mensalista</TabsTrigger>
                  <TabsTrigger value="diarista">PIX Diarista</TabsTrigger>
                </TabsList>
                <TabsContent value="mensalista" className="pt-4 space-y-4">
                  <FormField control={form.control} name="pix_key_mensalista" render={({ field }) => (
                    <FormItem><FormLabel>Chave PIX (Copia e Cola)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {renderQrCodeUploader('mensalista')}
                </TabsContent>
                <TabsContent value="diarista" className="pt-4 space-y-4">
                  <FormField control={form.control} name="pix_key_diarista" render={({ field }) => (
                    <FormItem><FormLabel>Chave PIX (Copia e Cola)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {renderQrCodeUploader('diarista')}
                </TabsContent>
              </Tabs>
              
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Dados do Beneficiário (Comum para ambos)</h3>
                <FormField control={form.control} name="beneficiary_name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Beneficiário</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="beneficiary_document" render={({ field }) => (
                  <FormItem><FormLabel>CPF/CNPJ do Beneficiário</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bank_name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Banco</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Configurações"}</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PixConfigDialog;