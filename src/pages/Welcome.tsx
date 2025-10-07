"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HomeIcon, UsersIcon, ShieldCheckIcon, PlusCircleIcon, LogInIcon } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      // Se o usuário já estiver logado, redireciona para o dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center text-center">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bem-vindo ao Baba dos Baianos!
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Organize seus jogos de futebol com facilidade, gerencie jogadores, sorteie times e controle pagamentos. Tudo em um só lugar!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mb-10">
          <Card className="flex flex-col items-center text-center p-6 border-primary">
            <CardHeader>
              <PlusCircleIcon className="h-12 w-12 text-primary mb-4" />
              <CardTitle className="text-2xl">Administrar seu Baba</CardTitle>
              <CardDescription>
                Crie e gerencie seu próprio grupo de futebol.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild size="lg" className="w-full">
                <Link to="/administer-baba">
                  <ShieldCheckIcon className="mr-2 h-5 w-5" />
                  Começar a Administrar
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center text-center p-6 border-accent">
            <CardHeader>
              <UsersIcon className="h-12 w-12 text-accent mb-4" />
              <CardTitle className="text-2xl">Entrar em um Baba Existente</CardTitle>
              <CardDescription>
                Junte-se a um grupo de futebol já criado.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild size="lg" variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
                <Link to="/join-baba">
                  <LogInIcon className="mr-2 h-5 w-5" />
                  Entrar em um Baba
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="bg-card p-6 rounded-lg shadow-sm border text-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-xl">📅</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Agende Babas</h3>
            <p className="text-muted-foreground">Organize jogos semanais com facilidade</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm border text-center">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-accent-foreground font-bold text-xl">👥</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Sorteie Times</h3>
            <p className="text-muted-foreground">Crie times equilibrados automaticamente</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg shadow-sm border text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">💰</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Controle Financeiro</h3>
            <p className="text-muted-foreground">Gerencie pagamentos e mensalidades</p>
          </div>
        </div>
      </main>

      <MadeWithDyad />
    </div>
  );
};

export default Welcome;