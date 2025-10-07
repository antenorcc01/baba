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

const AdministerBaba = () => {
  const [babaName, setBabaName] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session && profile?.baba_id && profile?.role === 'admin') {
      // Se já é admin de um baba, redireciona para o dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [session, profile, authLoading, navigate]);

  const handleCreateBaba = async () => {
    if (!babaName.trim()) {
      showError("O nome do Baba é obrigatório.");
      return;
    }
    if (!session?.user) {
      showError("Você precisa estar logado para criar um Baba.");
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      // 1. Criar o novo tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: babaName, admin_user_id: session.user.id })
        .select('id')
        .single();

      if (tenantError) throw tenantError;

      const newBabaId = tenantData.id;

      // 2. Atualizar o perfil do usuário para ser admin deste novo tenant
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ baba_id: newBabaId, role: 'admin' })
        .eq('id', session.user.id);

      if (profileUpdateError) throw profileUpdateError;

      showSuccess(`Baba "${babaName}" criado com sucesso! Você é o administrador.`);
      navigate('/dashboard', { replace: true }); // Redireciona para o dashboard
    } catch (error: any) {
      console.error("Erro ao criar Baba:", error);
      showError(error.message || "Erro ao criar o Baba.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
              Seja o administrador do seu próprio grupo de futebol.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baba-name">Nome do seu Baba</Label>
              <Input
                id="baba-name"
                placeholder="Ex: Baba dos Amigos"
                value={babaName}
                onChange={(e) => setBabaName(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button onClick={handleCreateBaba} className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando Baba...
                </>
              ) : (
                "Criar Meu Baba"
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <Card className="border-accent">
          <CardHeader className="text-center">
            <LogInIcon className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle className="text-2xl">Já tem um Baba?</CardTitle>
            <CardDescription>
              Faça login para gerenciar seu Baba existente.
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