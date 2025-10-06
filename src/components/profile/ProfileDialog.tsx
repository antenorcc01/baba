"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UploadIcon, StarIcon, GoalIcon, CameraIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';
import { ScrollArea } from "@/components/ui/scroll-area";

const profileSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  playerType: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  isMensalista: z.boolean().default(false),
  instagram: z.string().optional(),
  skillLevel: z.string().optional(),
  totalGoals: z.number().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userIdToEdit?: string | null;
  onUpdateSuccess?: () => void;
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

const ProfileDialog = ({ isOpen, onOpenChange, userIdToEdit, onUpdateSuccess }: ProfileDialogProps) => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileName, setProfileName] = useState("");

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const targetUserId = userIdToEdit || user?.id;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      playerType: "",
      profilePictureUrl: "",
      isMensalista: false,
      instagram: "",
      skillLevel: "1",
      totalGoals: 0,
    },
  });

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (targetUserId && isOpen) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

          if (error) throw error;
          
          if (data) {
            form.reset({
              fullName: data.full_name || "",
              phone: data.phone ? formatPhoneNumber(data.phone) : "",
              playerType: data.player_type || "",
              profilePictureUrl: data.profile_picture_url || "",
              isMensalista: data.is_mensalista || false,
              instagram: data.instagram || "",
              skillLevel: data.skill_level?.toString() || "1",
              totalGoals: data.total_goals || 0,
            });
            setProfileName(data.full_name || "");
          }
        } catch (error: any) {
          showError(error.message || "Erro ao carregar perfil");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [targetUserId, isOpen, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
        setShowCropper(true);
        event.target.value = '';
    });
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    if (!imageToCrop || !croppedAreaPixels || !targetUserId) {
        showError("Erro: Imagem ou área de corte não definida.");
        return;
    }

    setUploading(true);
    try {
        const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);

        if (!croppedImageBlob) {
            throw new Error("Falha ao gerar imagem cortada.");
        }

        const fileExt = 'jpeg';
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `${targetUserId}/${fileName}`; 

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, croppedImageBlob, {
                upsert: true,
                contentType: 'image/jpeg',
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        form.setValue('profilePictureUrl', publicUrl);
        showSuccess("Foto de perfil atualizada com sucesso!");
        setShowCropper(false);
        setImageToCrop(null);
    } catch (error: any) {
        showError(error.message || "Erro ao fazer upload da imagem cortada.");
    } finally {
        setUploading(false);
    }
  };

  const handleSubmit = async (data: ProfileFormData) => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const phoneWithoutMask = data.phone.replace(/\D/g, '');

      const updateData: any = {
        full_name: data.fullName,
        phone: phoneWithoutMask,
        player_type: data.playerType || null,
        profile_picture_url: data.profilePictureUrl || null,
        instagram: data.instagram || null,
        updated_at: new Date().toISOString(),
      };

      if (isAdmin) {
        updateData.is_mensalista = data.isMensalista;
        if (!data.isMensalista) {
          updateData.payment_status = 'diarista';
        }
        updateData.skill_level = parseInt(data.skillLevel || "1", 10);
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', targetUserId);

      if (error) throw error;

      showSuccess("Perfil atualizado com sucesso!");
      onUpdateSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    form.setValue('phone', formattedValue);
  };

  const isEditingSelf = !userIdToEdit || userIdToEdit === user?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditingSelf ? "Editar Meu Perfil" : `Editar Perfil de ${profileName}`}</DialogTitle>
          <DialogDescription>
            {showCropper ? "Ajuste a área da imagem para sua foto de perfil." : "Atualize as informações e preferências."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0077B6]"></div>
          </div>
        ) : showCropper ? (
          <div className="space-y-4 py-4">
            <div className="relative w-full h-64 bg-muted">
              <Cropper
                image={imageToCrop!}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="zoom-range">Zoom</Label>
                <Input
                    id="zoom-range"
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCropper(false)} disabled={uploading}>
                    Cancelar
                </Button>
                <Button onClick={handleCropAndUpload} disabled={uploading}>
                    {uploading ? "Cortando e Enviando..." : "Cortar e Enviar"}
                </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[70vh] pr-4">
              <Form {...form}>
                <form id="profile-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                  <div className="flex flex-col items-center space-y-2">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={form.watch('profilePictureUrl')} />
                      <AvatarFallback className="text-3xl">
                        {form.watch('fullName')?.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="profile-picture-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <div>
                            <UploadIcon className="h-4 w-4 mr-2" />
                            {uploading ? "Enviando..." : "Enviar Imagem"}
                          </div>
                        </Button>
                      </Label>
                      <Input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Label htmlFor="profile-picture-camera" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <div>
                            <CameraIcon className="h-4 w-4 mr-2" />
                            Tirar Foto
                          </div>
                        </Button>
                      </Label>
                      <Input
                        id="profile-picture-camera"
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
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
                        <FormLabel>Telefone</FormLabel>
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
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="@seuusuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="playerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posição Preferencial</FormLabel>
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
                      name="skillLevel"
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

                  <FormField
                    control={form.control}
                    name="isMensalista"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Mensalista</FormLabel>
                          <FormMessage />
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isAdmin}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isAdmin && (
                    <FormField
                      control={form.control}
                      name="totalGoals"
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
                </form>
              </Form>
            </ScrollArea>
            <DialogFooter>
              <Button type="submit" form="profile-form" disabled={loading || uploading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;