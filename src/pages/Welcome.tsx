"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircleIcon, LogInIcon, ArrowRight } from "lucide-react";

const animatedWords = ["Futebol", "Pelada", "Racha", "Rachão", "Baba"];

const Welcome = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prevIndex) => (prevIndex + 1) % animatedWords.length);
    }, 2000); // Troca a palavra a cada 2 segundos

    return () => clearInterval(interval); // Limpa o intervalo ao desmontar o componente
  }, []);

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
            Bem-vindo ao <span className="inline-block text-primary w-48 text-left">{animatedWords[wordIndex]}</span> dos Amigos!
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Organize seus jogos de futebol com facilidade, gerencie jogadores, sorteie times e controle pagamentos. Tudo em um só lugar!
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6">
              Comece Agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Qual o seu próximo passo?</DialogTitle>
              <DialogDescription className="text-center">
                Crie um novo grupo de futebol ou junte-se a um que já existe.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4 pt-4">
              <Button asChild size="lg" className="w-full">
                <Link to="/administer-baba">
                  <PlusCircleIcon className="mr-2 h-5 w-5" />
                  Criar um Novo Grupo
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link to="/join-baba">
                  <LogInIcon className="mr-2 h-5 w-5" />
                  Entrar em um Grupo Existente
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="bg-card p-6 rounded-lg shadow-sm border text-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-xl">📅</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Agende Jogos</h3>
            <p className="text-muted-foreground">Organize partidas semanais com facilidade</p>
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