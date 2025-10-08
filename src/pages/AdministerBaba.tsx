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
  const [registerPlayerType, setRegisterPlayerType] = useState("linha");
  const [registerIsMensalista, setRegisterIsMensalista] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentBabaName, setCurrentBabaName] = useState<string | null>(null);
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session && profile?.baba_id) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, profile, authLoading, navigate]);

  useEffect(() => {
    const fetchCurrentBabaName = async () => {
      // This logic might need adjustment if there are multiple tenants.
      // For now, it fetches any available baba_name.
      const { data, error } = await supabase
        .from('group_settings')
        .select('setting_value')
        .eq('setting_key', 'baba_name')
        .limit(1)
        .single();

      if (data) {
        setCurrentBabaName(data.setting_value);
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
    if (!babaName.trim() || !registerName.trim() || !registerEmail.trim() || !registerPassword.trim() || !registerPhone.trim()) {
      showError("Todos os campos são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const phoneWithoutMask = registerPhone.replace(/\D/g, '');

      // Call the new Edge Function to handle creation atomically
      const { error: functionError } = await supabase.functions.invoke('create-baba-and-admin', {
        body: {
          babaName,
          adminEmail: registerEmail,
          adminPassword: registerPassword,
          adminProfileData: {
            full_name: registerName,
            phone: phoneWithoutMask,
            player_type: registerPlayerType,
            is_mensalista: registerIsMensalista,
          },
        },
      });

      if (functionError) throw new Error(functionError.message);

      // After successful creation, sign the new user in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: registerEmail,
        password: registerPassword,
      });

      if (signInError) throw signInError;

      showSuccess(`Baba "${babaName}" criado com sucesso! Você é o administrador.`);
      // The AuthProvider will detect the new session and redirect to the dashboard.
      // Forcing a reload can sometimes help ensure all context is fresh.
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error("Erro ao criar Baba:", error);
      showError(error.message || "Erro ao criar o Baba.");
    } finally {
      setLoading(false);
    }
  };

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