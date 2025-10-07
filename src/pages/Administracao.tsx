"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings, Users, MapPin, ScrollText, Trash2, Trophy } from "lucide-react";
import JogadoresTab from "@/components/admin/JogadoresTab";
import ArenasTab from "@/components/admin/ArenasTab";
import RegulamentoTab from "@/components/admin/RegulamentoTab";
import ConfiguracoesTab from "@/components/admin/ConfiguracoesTab";
import TorneiosTab from "@/components/admin/TorneiosTab";
import { GradientBackground } from "@/components/ui/gradient-background";

const Administracao = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard", { replace: true });
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
    return null;
  }

  return (
    <GradientBackground 
      enableCenterContent={false} 
      overlay={true} 
      overlayOpacity={0.8}
      gradients={[
        "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
      ]}
      className="flex-grow"
    >
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Painel de Administração</h1>
          <p className="text-slate-300">Gerencie todos os aspectos do seu Baba.</p>
        </div>
        <Tabs defaultValue="geral" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="geral"><Settings className="w-4 h-4 mr-2" />Geral</TabsTrigger>
            <TabsTrigger value="jogadores"><Users className="w-4 h-4 mr-2" />Jogadores</TabsTrigger>
            <TabsTrigger value="torneios"><Trophy className="w-4 h-4 mr-2" />Torneios</TabsTrigger>
            <TabsTrigger value="arenas"><MapPin className="w-4 h-4 mr-2" />Arenas</TabsTrigger>
            <TabsTrigger value="regulamento"><ScrollText className="w-4 h-4 mr-2" />Regulamento</TabsTrigger>
          </TabsList>
          <TabsContent value="geral">
            <ConfiguracoesTab />
          </TabsContent>
          <TabsContent value="jogadores">
            <JogadoresTab />
          </TabsContent>
          <TabsContent value="torneios">
            <TorneiosTab />
          </TabsContent>
          <TabsContent value="arenas">
            <ArenasTab />
          </TabsContent>
          <TabsContent value="regulamento">
            <RegulamentoTab />
          </TabsContent>
        </Tabs>
      </div>
    </GradientBackground>
  );
};

export default Administracao;