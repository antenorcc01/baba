"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, UserPlus, TrophyIcon, StarIcon } from "lucide-react"; // Importar TrophyIcon
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import GuestPlayerForm, { GuestPlayerFormData, GuestPlayer } from "@/components/players/GuestPlayerForm";
import { useAuth } from "@/contexts/AuthContext";
import ConvertGuestDialog from "./ConvertGuestDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GuestPlayerWithInviter extends GuestPlayer {
  is_suspended?: boolean;
  invited_by_profile?: {
    full_name: string;
  } | null;
  titles: number;
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

export default function ConvidadosTab() {
  const [guests, setGuests] = useState<GuestPlayerWithInviter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestPlayer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [guestToConvert, setGuestToConvert] = useState<GuestPlayer | null>(null);

  const { user, isAdmin, loading: authLoading, profile, isSuspended } = useAuth();

  const isBlocked = !isAdmin && profile?.is_mensalista && profile.payment_status !== 'pago';

  const fetchGuests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: guestsError } = await supabase
        .from("guest_players")
        .select("*, invited_by_profile:profiles(full_name)")
        .eq('is_deleted', false)
        .order('full_name');
      if (guestsError) throw guestsError;
      setGuests(data || []);
    } catch (err: any) {
      setError("Erro ao carregar convidados");
      showError(err.message || "Erro ao carregar convidados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchGuests();
    }
  }, [authLoading, isAdmin, user]);

  const handleGuestFormSubmit = async (data: GuestPlayerFormData) => {
    setIsSubmitting(true);
    try {
      const phoneWithoutMask = data.phone?.replace(/\D/g, "") || null;
      const submissionData: any = {
        full_name: data.full_name,
        phone: phoneWithoutMask,
        player_type: data.player_type || null,
        invited_by: data.invited_by || null,
        skill_level: data.skill_level,
        baba_id: profile?.baba_id,
      };
      if (!isAdmin && user) {
        submissionData.invited_by = user.id;
      }

      console.log("Submitting guest data:", submissionData);

      if (editingGuest) {
        const { error } = await supabase
          .from("guest_players")
          .update(submissionData)
          .eq("id", editingGuest.id);
        if (error) throw error;
        showSuccess("Convidado atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("guest_players").insert(submissionData);
        if (error) throw error;
        showSuccess("Convidado adicionado com sucesso!");
      }
      closeGuestDialog();
      fetchGuests();
    } catch (err: any) {
      showError(err.message || "Erro ao salvar convidado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja enviar "${name}" para a lixeira?`)) return;

    const { error } = await supabase.from('guest_players').update({ is_deleted: true }).eq('id', id);

    if (error) {
      showError(`Erro ao mover para a lixeira: ${error.message}`);
    } else {
      showSuccess(`"${name}" foi movido para a lixeira.`);
      fetchGuests();
    }
  };

  const openAddGuestDialog = () => {
    setEditingGuest(null);
    setIsGuestDialogOpen(true);
  };
  const openEditGuestDialog = (guest: GuestPlayer) => {
    setEditingGuest(guest);
    setIsGuestDialogOpen(true);
  };
  const closeGuestDialog = () => setIsGuestDialogOpen(false);

  const openConvertDialog = (guest: GuestPlayer) => {
    setGuestToConvert(guest);
    setIsConvertDialogOpen(true);
  };

  const filteredGuests = guests.filter((guest) => {
    const guestName = (guest.full_name || "").toLowerCase();
    const guestPhone = guest.phone || "";
    return guestName.includes(searchTerm.toLowerCase()) || guestPhone.includes(searchTerm);
  });

  const getPositionBadge = (playerType?: string | null) => {
    switch (playerType) {
      case "linha": return <Badge className="bg-primary text-primary-foreground">Linha</Badge>;
      case "goleiro": return <Badge className="bg-green-500 text-white">Goleiro</Badge>;
      case "ambos": return <Badge className="bg-accent text-accent-foreground">Ambos</Badge>;
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
          <Input placeholder="Buscar convidados..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <Button onClick={openAddGuestDialog} disabled={isBlocked || isSuspended}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Convidado
              </Button>
            </div>
          </TooltipTrigger>
          {isBlocked && (
            <TooltipContent>
              <p>Apenas mensalistas em dia podem adicionar convidados.</p>
            </TooltipContent>
          )}
          {isSuspended && (
            <TooltipContent>
              <p>Você está suspenso e não pode adicionar convidados.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <Button onClick={fetchGuests} className="mt-2">Tentar novamente</Button>
        </div>
      )}

      {filteredGuests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum convidado encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.map((guest) => (
            <Card key={guest.id} className="relative flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">{guest.full_name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{guest.full_name}</CardTitle>
                    <CardDescription className="pt-1">{getPositionBadge(guest.player_type)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{formatPhoneNumberForDisplay(guest.phone)}</span>
                  </div>
                  {guest.invited_by_profile && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Convidado por:</span>
                      <span className="font-medium">{guest.invited_by_profile.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nível:</span>
                    {renderSkillStars(guest.skill_level)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Títulos:</span>
                    <div className="flex items-center gap-1 font-bold">
                      <TrophyIcon className="h-4 w-4 text-yellow-500" />
                      <span>{guest.titles || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => openConvertDialog(guest)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Converter em Jogador</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => openEditGuestDialog(guest)}>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar Convidado</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="destructive" size="icon" onClick={() => handleSoftDelete(guest.id, guest.full_name)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Excluir Convidado</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isGuestDialogOpen} onOpenChange={setIsGuestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingGuest ? "Editar Convidado" : "Adicionar Convidado"}</DialogTitle>
          </DialogHeader>
          <GuestPlayerForm
            guest={editingGuest ?? undefined}
            onSubmit={handleGuestFormSubmit}
            onCancel={closeGuestDialog}
            isSubmitting={isSubmitting}
            isAdmin={!!isAdmin}
          />
        </DialogContent>
      </Dialog>

      <ConvertGuestDialog
        isOpen={isConvertDialogOpen}
        onOpenChange={setIsConvertDialogOpen}
        guest={guestToConvert}
        onSuccess={fetchGuests}
      />
    </div>
  );
}