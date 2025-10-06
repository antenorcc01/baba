"use client";

import { useState, useEffect } from "react"; // Importar useEffect
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserIcon, PhoneIcon, ShieldCheckIcon, EditIcon, KeyRoundIcon, TrophyIcon, MessageCircle, StarIcon, GoalIcon } from "lucide-react"; // Importar MessageCircle, StarIcon e GoalIcon
import ProfileDialog from "@/components/profile/ProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { InstagramIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"; // Importar Tooltip

const passwordSchema = z.object({
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const PerfilPage = () => {
  const { user, profile, loading } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null); // Estado para o link do WhatsApp

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const fetchWhatsappLink = async () => {
      const { data, error } = await supabase
        .from('group_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_group_link')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching WhatsApp link in Perfil:", error);
        setWhatsappLink(null); // Garante que o estado seja null em caso de erro
      } else if (data) {
        setWhatsappLink(data.setting_value);
        console.log("WhatsApp Link fetched in Perfil:", data.setting_value);
      } else {
        setWhatsappLink(null); // Garante que o estado seja null se não houver dados
        console.log("WhatsApp Link not found in Perfil.");
      }
    };

    fetchWhatsappLink();
  }, []); // Executa apenas uma vez ao montar o componente

  const handlePasswordChange = async (data: PasswordFormData) => {
    setIsSubmittingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      showSuccess("Senha alterada com sucesso!");
      passwordForm.reset();
    } catch (error: any) {
      showError(error.message || "Erro ao alterar a senha.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleOpenWhatsappGroup = () => {
    if (whatsappLink) {
      window.open(whatsappLink, '_blank'); // Abre o link em uma nova aba
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex-grow flex items-center justify-center text-center">
        <p>Não foi possível carregar o perfil. Por favor, tente novamente.</p>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusBadge = () => {
    if (!profile) return null;
    switch (profile.payment_status) {
      case "pago":
        return <Badge className="bg-green-500 text-primary-foreground">EM DIA</Badge>;
      case "pendente":
        return <Badge className="bg-yellow-500 text-primary-foreground">PENDENTE</Badge>;
      case "atrasado":
        return <Badge variant="destructive">CALOTEIRO</Badge>;
      case "diarista":
        return <Badge className="bg-blue-500 text-primary-foreground">DIARISTA</Badge>;
      default:
        return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const renderSkillStars = (level: number | undefined) => {
    const stars = [];
    for (let i = 1; i <= 3; i++) {
      stars.push(
        <StarIcon 
          key={i} 
          className={`h-4 w-4 ${i <= (level || 1) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground py-4 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold">Meu Perfil</h1>
            {/* <ModeToggle /> Removido daqui */}
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={profile.profile_picture_url || ""} />
                  <AvatarFallback className="text-3xl">
                    {getInitials(profile.full_name || "")}
                  </AvatarFallback>
                </Avatar>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        className="absolute bottom-4 right-0 rounded-full h-8 w-8"
                        onClick={() => setIsProfileDialogOpen(true)}
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar Perfil</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Telefone</span>
                </div>
                <span className="text-sm">{profile.phone || "Não informado"}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <InstagramIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Instagram</span>
                </div>
                {profile.instagram ? (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    @{profile.instagram.replace('@', '')}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">Não informado</span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Posição</span>
                </div>
                <span className="text-sm capitalize">{profile.player_type || "Não informada"}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <StarIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Nível de Habilidade</span>
                </div>
                {renderSkillStars(profile.skill_level)}
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Status Financeiro</span>
                </div>
                {getStatusBadge()}
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <TrophyIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Títulos</span>
                </div>
                <span className="text-sm font-bold">{profile.titles || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <GoalIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Gols Marcados</span>
                </div>
                <span className="text-sm font-bold">{profile.total_goals || 0}</span>
              </div>
            </CardContent>
          </Card>

          {whatsappLink && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Grupo WhatsApp
                </CardTitle>
                <CardDescription>
                  Participe do grupo oficial do Baba dos Baianos no WhatsApp para ficar por dentro das novidades e interagir com a comunidade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleOpenWhatsappGroup} className="w-full">
                  Entrar no Grupo
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRoundIcon className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Para sua segurança, recomendamos o uso de uma senha forte.
              </CardDescription>
            </CardHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="submit" disabled={isSubmittingPassword}>
                          {isSubmittingPassword ? "Salvando..." : "Salvar Nova Senha"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Salvar a nova senha para sua conta.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </main>
      </div>
      <ProfileDialog 
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        onUpdateSuccess={() => window.location.reload()}
      />
    </>
  );
};

export default PerfilPage;