"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchIcon, ArrowLeftIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tenant {
  id: string;
  name: string;
}

const JoinBaba = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && session && profile?.baba_id) {
      // Se o usuário já está em um baba, redireciona para o dashboard
      navigate('/dashboard', { replace: true });
    } else if (!authLoading && !session) {
      // Se não está logado, redireciona para a página de autenticação
      navigate('/auth', { replace: true });
    }
  }, [session, profile, authLoading, navigate]);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name')
          .order('name');
        if (error) throw error;
        setAvailableTenants(data || []);
      } catch (error: any) {
        showError(error.message || "Erro ao carregar a lista de Babas.");
      } finally {
        setLoading(false);
      }
    };
    if (session) { // Só busca tenants se o usuário estiver logado
      fetchTenants();
    }
  }, [session]);

  const handleJoinBaba = async () => {
    if (!selectedTenantId) {
      showError("Por favor, selecione um Baba para entrar.");
      return;
    }
    if (!session?.user) {
      showError("Você precisa estar logado para entrar em um Baba.");
      navigate('/auth');
      return;
    }

    setIsJoining(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ baba_id: selectedTenantId })
        .eq('id', session.user.id);

      if (error) throw error;

      const selectedTenantName = availableTenants.find(t => t.id === selectedTenantId)?.name;
      showSuccess(`Você entrou no Baba "${selectedTenantName}" com sucesso!`);
      navigate('/dashboard', { replace: true }); // Redireciona para o dashboard
    } catch (error: any) {
      console.error("Erro ao entrar no Baba:", error);
      showError(error.message || "Erro ao entrar no Baba.");
    } finally {
      setIsJoining(false);
    }
  };

  const filteredTenants = availableTenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Redirecionamento já foi tratado no useEffect
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

        <Card className="border-accent">
          <CardHeader className="text-center">
            <SearchIcon className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle className="text-2xl">Entrar em um Baba Existente</CardTitle>
            <CardDescription>
              Selecione um Baba da lista para se juntar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar Baba..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isJoining}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-baba">Selecione o Baba</Label>
              <Select onValueChange={setSelectedTenantId} value={selectedTenantId || ''} disabled={isJoining}>
                <SelectTrigger id="select-baba">
                  <SelectValue placeholder="Escolha um Baba" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTenants.length > 0 ? (
                    filteredTenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum Baba encontrado.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleJoinBaba} className="w-full" disabled={isJoining || !selectedTenantId}>
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no Baba"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinBaba;