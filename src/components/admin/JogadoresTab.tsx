"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, StarIcon } from "lucide-react"; // Importar StarIcon
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import NewPlayerForm, { NewPlayerFormData } from "@/components/players/NewPlayerForm";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDialog from "@/components/profile/ProfileDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  player_type?: string;
  profile_picture_url?: string;
  role?: string;
  payment_status?: "pago" | "pendente" | "atrasado" | "diarista";
  is_mensalista: boolean;
  is_deleted: boolean;
  is_suspended: boolean;
  instagram?: string;
  created_at: string;
  updated_at: string;
  skill_level?: number; // Adicionado skill_level
}

const formatPhoneNumberForDisplay = (phone?: string | null) => {
  if (!phone) return "Não informado";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export default function JogadoresTab() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const { isAdmin, loading: authLoading } = useAuth();

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq('is_deleted', false)
        .order('full_name');
      if (profilesError) throw profilesError;
      setPlayers(profiles || []);
    } catch (err: any) {
      setError("Erro ao carregar jogadores");
      showError(err.message || "Erro ao carregar jogadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPlayers();
    }
  }, [authLoading]);

  const handleNewPlayerSubmit = async (data: NewPlayerFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          data: {
            full_name: data.fullName,
            phone: data.phone.replace(/\D/g, ""),
            skill_level: 1, // Novo jogador inicia com 1 estrela
          },
        },
      });

      if (error) throw error;
      showSuccess("Jogador cadastrado! Peça para ele verificar o e-mail.");
      setIsPlayerDialogOpen(false);
      fetchPlayers();
    } catch (err: any) {
      showError(err.message || "Erro ao cadastrar jogador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja enviar "${name}" para a lixeira?`)) return;

    const { error } = await supabase.from('profiles').update({ is_deleted: true }).eq('id', id);

    if (error) {
      showError(`Erro ao mover para a lixeira: ${error.message}`);
    } else {
      showSuccess(`"${name}" foi movido para a lixeira.`);
      fetchPlayers();
    }
  };

  const handleStatusChange = async (playerId: string, newStatus: Profile['payment_status']) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ payment_status: newStatus })
        .eq('id', playerId);

      if (error) throw error;
      
      showSuccess("Status do jogador atualizado com sucesso!");
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === playerId ? { ...p, payment_status: newStatus } : p)
      );
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar status.");
    }
  };

  const openAddPlayerDialog = () => setIsPlayerDialogOpen(true);
  const closeAddPlayerDialog = () => setIsPlayerDialogOpen(false);

  const handleProfileUpdateSuccess = () => {
    setEditingPlayerId(null);
    fetchPlayers();
  };

  const filteredPlayers = players.filter((player) => {
    const playerName = (player.full_name || "").toLowerCase();
    const playerPhone = player.phone || "";
    return playerName.includes(searchTerm.toLowerCase()) || playerPhone.includes(searchTerm);
  });

  const getPositionBadge = (playerType?: string | null) => {
    switch (playerType) {
      case "linha": return <Badge className="bg-primary text-primary-foreground">Linha</Badge>;
      case "goleiro": return <Badge className="bg-green-500 text-white">Goleiro</Badge>;
      case "ambos": return <Badge className="bg-accent text-accent-foreground">Ambos</Badge>;
      default: return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const getStatusBadge = (player: Profile) => {
    if (player.is_suspended) {
      return <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700">SUSPENSO</Badge>;
    }
    switch (player.payment_status) {
      case "pago": return <Badge className="bg-green-500 text-primary-foreground">EM DIA</Badge>;
      case "pendente": return <Badge className="bg-yellow-500 text-primary-foreground">PENDENTE</Badge>;
      case "atrasado": return <Badge variant="destructive">CALOTEIRO</Badge>;
      case "diarista": return <Badge className="bg-blue-500 text-primary-foreground">DIARISTA</Badge>;
      default: return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const renderSkillStars = (level: number | undefined) => {
    const stars = [];
    for (let i = 1; i <= 3; i++) {
      stars.push(
        <StarIcon 
          key={i} 
          className={`h-4 w-4 ${i <= (level || 1) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Buscar jogadores..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {isAdmin && (
          <Button onClick={openAddPlayerDialog}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Jogador
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <Button onClick={fetchPlayers} className="mt-2">Tentar novamente</Button>
        </div>
      )}

      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum jogador encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player) => (
            <Card key={player.id} className="relative flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={player.profile_picture_url || ''} />
                    <AvatarFallback className="text-lg">{player.full_name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{player.full_name}</CardTitle>
                    <CardDescription className="pt-1">{getPositionBadge(player.player_type)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{formatPhoneNumberForDisplay(player.phone)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(player)}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">Nível:</span>
                    {renderSkillStars(player.skill_level)}
                  </div>
                  {isAdmin && player.is_mensalista && (
                    <div className="mt-4">
                      <Label className="text-xs text-muted-foreground">Alterar Status (Admin)</Label>
                      <Select
                        value={player.payment_status}
                        onValueChange={(value: Profile['payment_status']) => handleStatusChange(player.id, value)}
                      >
                        <SelectTrigger className="h-8 text-xs w-full mt-1">
                          <SelectValue placeholder="Alterar status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pago">EM DIA</SelectItem>
                          <SelectItem value="pendente">PENDENTE</SelectItem>
                          <SelectItem value="atrasado">CALOTEIRO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setEditingPlayerId(player.id)}>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar Jogador</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="destructive" size="icon" onClick={() => handleSoftDelete(player.id, player.full_name)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Excluir Jogador</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Jogador</DialogTitle>
          </DialogHeader>
          <NewPlayerForm onSubmit={handleNewPlayerSubmit} onCancel={closeAddPlayerDialog} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      {editingPlayerId && (
        <ProfileDialog
          isOpen={!!editingPlayerId}
          onOpenChange={(open) => !open && setEditingPlayerId(null)}
          userIdToEdit={editingPlayerId}
          onUpdateSuccess={handleProfileUpdateSuccess}
        />
      )}
    </div>
  );
}