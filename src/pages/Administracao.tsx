import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ArenasTab from "@/components/admin/ArenasTab";
import JogadoresTab from "@/components/admin/JogadoresTab";
import ConvidadosTab from "@/components/admin/ConvidadosTab";
import FinanceiroTab from "@/components/admin/FinanceiroTab";
import RegulamentoTab from "@/components/admin/RegulamentoTab";
import ConfiguracoesTab from "@/components/admin/ConfiguracoesTab";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";

export default function Administracao() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      showError("Acesso negado. Você não tem permissão para acessar esta página.");
      navigate("/babas");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // or redirect component
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Administração</h1>
        <p className="text-muted-foreground">Gerencie todos os aspectos do Baba dos Baianos.</p>
      </div>
      <Tabs defaultValue="arenas" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <TabsList className="flex w-max">
            <TabsTrigger value="arenas">Arenas</TabsTrigger>
            <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
            <TabsTrigger value="convidados">Convidados</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="regulamento">STJD</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <TabsContent value="arenas">
          <ArenasTab />
        </TabsContent>
        <TabsContent value="jogadores">
          <JogadoresTab />
        </TabsContent>
        <TabsContent value="convidados">
          <ConvidadosTab />
        </TabsContent>
        <TabsContent value="financeiro">
          <FinanceiroTab />
        </TabsContent>
        <TabsContent value="regulamento">
          <RegulamentoTab />
        </TabsContent>
        <TabsContent value="configuracoes">
          <ConfiguracoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}