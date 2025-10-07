"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircleIcon, LogInIcon, ArrowLeftIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const AdministerBaba = () => {
  const [babaName, setBabaName] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPlayerType, setRegisterPlayerType] = useState("linha"); // Default to 'linha'
  const [registerIsMensalista, setRegisterIsMensalista] = useState(true); // Default to true
  const [loading, setLoading] = useState(false);
  const [currentBabaName, setCurrentBabaName] = useState<string | null>(null); // Para exibir o nome do baba existente
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirecionamento se o usuário JÁ ESTIVER logado e em um baba
  useEffect(() => {
    if (!authLoading && session && profile?.baba_id) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, profile, authLoading, navigate]);

  useEffect(() => {
    const fetchCurrentBabaName = async () => {
      const { data, error } = await supabase
        .from('group_settings')
        .select('setting_value')
        .eq('setting_key', 'baba_name')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching baba name in AdministerBaba:", error);
        setCurrentBabaName(null);
      } else if (data) {
        setCurrentBabaName(data.setting_value);
      } else {
        setCurrentBabaName(null);
      }
    };
    fetchCurrentBabaName();
  }, []);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setRegisterPhone(formattedValue);
  };

  const handleCreateBaba = async () => {
    if (!babaName.trim()) {
      showError("O nome do Baba é obrigatório.");
      return;
    }
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim() || !registerPhone.trim()) {
      showError("Todos os campos de cadastro do administrador são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const phoneWithoutMask = registerPhone.replace(/\D/g, '');

      // 1. Create the new user (who will be the admin)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: registerName,
            phone: phoneWithoutMask,
            player_type: registerPlayerType,
            is_mensalista: registerIsMensalista,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não criado após o cadastro.");

      const newAdminUserId = authData.user.id;

      // 2. Create the new tenant (Baba)
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: babaName, admin_user_id: newAdminUserId })
        .select('id')
        .single();

      if (tenantError) throw tenantError;

      const newBabaId = tenantData.id;

      // 3. Update the new user's profile to be admin of this new tenant
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ baba_id: newBabaId, role: 'admin' })
        .eq('id', newAdminUserId);

      if (profileUpdateError) throw profileUpdateError;

      // 4. Save the baba name in group_settings for the new tenant
      const { error: settingsError } = await supabase
        .from('group_settings')
        .insert({ baba_id: newBabaId, setting_key: 'baba_name', setting_value: babaName });
      
      if (settingsError) console.error("Error saving baba name to group_settings:", settingsError);


      showSuccess(`Baba "${babaName}" criado com sucesso! Você é o administrador.`);
      navigate('/dashboard', { replace: true }); // Redireciona para o dashboard
    } catch (error: any) {
      console.error("Erro ao criar Baba:", error);
      showError(error.message || "Erro ao criar o Baba.");
    } finally {
      setLoading(false);
    }
  };

  // Se o usuário já está logado e não tem baba_id, ele deve ir para JoinBaba
  if (!authLoading && session && !profile?.baba_id) {
    navigate('/join-baba', { replace: true });
    return null;
  }

  // Mostrar loading enquanto verifica autenticação ou se já está em um baba
  if (authLoading || (session && profile?.baba_id)) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <Button asChild variant="ghost" className="mb-6 self-start">
          <Link to="/welcome" className="flex items-center gap-2 text-sm">
            <ArrowLeftIcon className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <Card className="border-primary">
          <CardHeader className="text-center">
            <PlusCircleIcon className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Criar Novo Baba</CardTitle>
            <CardDescription>
              Crie seu grupo de futebol e seja o administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baba-name">Nome do seu Baba</Label>
              <Input
                id="baba-name"
                placeholder="Ex: Baba dos Amigos"
                value={babaName}
                onChange={(e) => setBabaName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Separator />

            <h3 className="text-lg font-semibold">Dados do Administrador</h3>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Nome completo</Label>
              <Input 
                id="admin-name" 
                placeholder="Seu nome"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input 
                id="admin-email" 
                type="email" 
                placeholder="seu@email.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">Telefone</Label>
              <Input 
                id="admin-phone" 
                type="tel" 
                placeholder="(71) 91234-5678"
                value={registerPhone}
                onChange={handlePhoneChange}
                maxLength={15}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input 
                id="admin-password" 
                type="password" 
                placeholder="••••••••"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-player-type">Posição Preferencial</Label>
              <Select onValueChange={setRegisterPlayerType} value={registerPlayerType} disabled={loading}>
                <SelectTrigger id="admin-player-type">
                  <SelectValue placeholder="Selecione uma posição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linha">Linha</SelectItem>
                  <SelectItem value="goleiro">Goleiro</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between space-x-2 p-2 border rounded-md">
              <Label htmlFor="admin-is-mensalista" className="flex flex-col space-y-1">
                <span>Mensalista</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Se desmarcado, você será cadastrado como diarista.
                </span>
              </Label>
              <Switch
                id="admin-is-mensalista"
                checked={registerIsMensalista}
                onCheckedChange={setRegisterIsMensalista}
                disabled={loading}
              />
            </div>

            <Button onClick={handleCreateBaba} className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando Baba e Admin...
                </>
              ) : (
                "Criar Meu Baba e Administrador"
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <Card className="border-accent">
          <CardHeader className="text-center">
            <LogInIcon className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle className="text-2xl">Já tem uma conta?</CardTitle>
            <CardDescription>
              Faça login para gerenciar seu {currentBabaName || "Baba existente"} ou entrar em um.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
              <Link to="/auth">
                <LogInIcon className="mr-2 h-5 w-5" />
                Fazer Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdministerBaba;