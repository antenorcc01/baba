"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import RegisteredPlayersTab from "@/components/players/RegisteredPlayersTab";
import GuestPlayersTab from "@/components/players/GuestPlayersTab";

export default function JogadoresPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Comunidade de Jogadores</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Jogadores e Convidados</h2>
          <p className="text-muted-foreground">Visualize e gerencie todos os membros da comunidade.</p>
        </div>
        <Tabs defaultValue="registered" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <TabsList className="flex w-max">
              <TabsTrigger value="registered">Jogadores Registrados</TabsTrigger>
              <TabsTrigger value="guests">Convidados</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <TabsContent value="registered">
            <RegisteredPlayersTab />
          </TabsContent>
          <TabsContent value="guests">
            <GuestPlayersTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}