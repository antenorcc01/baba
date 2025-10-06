import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Babas from "./pages/Babas";
import Arenas from "./pages/Arenas";
import Jogadores from "./pages/Jogadores";
import Regulamento from "./pages/Regulamento";
import Administracao from "./pages/Administracao";
import NotFound from "./pages/NotFound";
import Header from "./components/layout/Header";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import MeusPagamentos from "./pages/MeusPagamentos";
import Perfil from "./pages/Perfil";
import BabaDetail from "./pages/BabaDetail";
import AgendarBaba from "./pages/AgendarBaba";
import Dashboard from "./pages/Dashboard";
import TorneiosPage from "./pages/Torneios"; // Importar a nova página de Torneios
import TournamentDetailPage from "./pages/TournamentDetail"; // Importar a página de detalhes do Torneio

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          storageKey="vite-ui-theme"
          themes={['light', 'dark', 'system', 'bbmp', 'leao']} // Adicionado os novos temas aqui
        >
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow flex flex-col">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/administracao" element={<Administracao />} />
                      <Route path="/babas" element={<Babas />} />
                      <Route path="/baba/:id" element={<BabaDetail />} />
                      <Route path="/admin/baba/novo" element={<AgendarBaba />} />
                      <Route path="/arenas" element={<Arenas />} />
                      <Route path="/jogadores" element={<Jogadores />} />
                      <Route path="/meus-pagamentos" element={<MeusPagamentos />} />
                      <Route path="/regulamento" element={<Regulamento />} />
                      <Route path="/perfil" element={<Perfil />} />
                      <Route path="/torneios" element={<TorneiosPage />} /> {/* Nova rota */}
                      <Route path="/torneios/:id" element={<TournamentDetailPage />} /> {/* Nova rota de detalhes */}
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;