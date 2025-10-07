"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChromeIcon, ArrowLeftIcon } from "lucide-react"; // Importar o ícone do Google e ArrowLeft

const AuthPage = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPlayerType, setRegisterPlayerType] = useState("linha"); // Default to 'linha'
  const [registerIsMensalista, setRegisterIsMensalista] = useState(true); // Default to true
  const [loading, setLoading] = useState(false);

  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirecionamento automático quando o usuário está logado E já tem um baba_id
  useEffect(() => {
    if (!authLoading && session && profile?.baba_id) {
      navigate('/dashboard', { replace: true });
    } else if (!authLoading && session && !profile?.baba_id) {
      // Se logado mas sem baba_id, redireciona para a escolha de baba
      navigate('/join-baba', { replace: true });
    }
  }, [session, profile, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      
      showSuccess("Login realizado com sucesso!");
      // O redirecionamento será tratado pelo useEffect
      
    } catch (error: any) {
      showError(error.message || "Erro ao realizar login");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/join-baba', // Redireciona para a página de escolha de baba após o login
        },
      });
      if (error) throw error;
      // No need for showSuccess here, onAuthStateChange will handle it
    } catch (error: any) {
      showError(error.message || "Erro ao fazer login com Google.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const phoneWithoutMask = registerPhone.replace(/\D/g, '');
      
      const { error } = await supabase.auth.signUp({
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
      
      if (error) throw error;
      
      showSuccess("Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.");
      
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPhone("");
      setRegisterPassword("");
      setRegisterPlayerType("linha");
      setRegisterIsMensalista(true);
      
      const loginTab = document.querySelector('[data-state="inactive"][data-value="login"]') as HTMLElement | null;
      if (loginTab) {
        loginTab.click();
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      showError(error.message || "Erro ao realizar cadastro");
    } finally {
      setLoading(false);
    }
  };

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

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se já está logado e sem baba_id, o useEffect já redirecionou para /join-baba
  // Se já está logado e com baba_id, o useEffect já redirecionou para /dashboard
  // Então, se chegamos aqui, o usuário não está logado.

  return (
    <div className="flex-grow flex flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-md">
          <Button asChild variant="ghost" className="mb-6 self-start">
            <Link to="/welcome" className="flex items-center gap-2 text-sm">
              <ArrowLeftIcon className="h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-primary">Acesse sua conta</CardTitle>
                  <CardDescription>
                    Entre com seu e-mail e senha para acessar o sistema
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col">
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                      disabled={loading}
                    >
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                    <div className="relative my-4 w-full">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                        OU
                      </span>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full flex items-center gap-2"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <ChromeIcon className="h-5 w-5" />
                      Entrar com Google
                    </Button>
                    <Button variant="link" className="mt-2 text-primary">
                      Esqueceu sua senha?
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-primary">Crie sua conta</CardTitle>
                  <CardDescription>
                    Cadastre-se para participar dos babas
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input 
                        id="name" 
                        placeholder="Seu nome"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input 
                        id="register-email" 
                        type="email" 
                        placeholder="seu@email.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="(71) 91234-5678"
                        value={registerPhone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="player-type">Posição Preferencial</Label>
                      <Select onValueChange={setRegisterPlayerType} value={registerPlayerType}>
                        <SelectTrigger id="player-type">
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
                      <Label htmlFor="is-mensalista" className="flex flex-col space-y-1">
                        <span>Mensalista</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                          Se desmarcado, você será cadastrado como diarista.
                        </span>
                      </Label>
                      <Switch
                        id="is-mensalista"
                        checked={registerIsMensalista}
                        onCheckedChange={setRegisterIsMensalista}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col">
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                      disabled={loading}
                    >
                      {loading ? "Cadastrando..." : "Cadastrar com E-mail"}
                    </Button>
                    <div className="relative my-4 w-full">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                        OU
                      </span>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full flex items-center gap-2"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <ChromeIcon className="h-5 w-5" />
                      Cadastrar com Google
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <MadeWithDyad />
    </div>
  );
};

export default AuthPage;