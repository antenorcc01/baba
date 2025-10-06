"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { GuestPlayer } from "@/components/players/GuestPlayerForm";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfirmedGuest extends GuestPlayer {
  games_guest_players_id: number;
}

interface GuestPresenceManagerProps {
  gameId: number;
  onPresenceChange: () => void;
  isAdmin: boolean;
  userId: string | null;
  disabled?: boolean;
}

const GuestPresenceManager = ({ gameId, onPresenceChange, isAdmin, userId, disabled = false }: GuestPresenceManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allGuests, setAllGuests] = useState<GuestPlayer[]>([]);
  const [confirmedGuests, setConfirmedGuests] = useState<ConfirmedGuest[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const { profile, isSuspended } = useAuth();

  const isBlocked = profile?.is_mensalista && profile.payment_status !== 'pago';

  const fetchGuests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('guest_players')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_suspended', false)
        .order('full_name');

      if (!isAdmin && userId) {
        query = query.eq('invited_by', userId);
      }

      const { data: allGuestsData, error: allGuestsError } = await query;
      if (allGuestsError) throw allGuestsError;
      setAllGuests(allGuestsData || []);

      const { data: confirmedGuestsData, error: confirmedGuestsError } = await supabase
        .from('games_guest_players')
        .select('id, guest_players(*)')
        .eq('game_id', gameId);
      if (confirmedGuestsError) throw confirmedGuestsError;
      
      const formattedConfirmedGuests = confirmedGuestsData
        .filter(item => item.guest_players)
        .map(item => ({
          ...(item.guest_players as GuestPlayer),
          games_guest_players_id: item.id,
        }));
      setConfirmedGuests(formattedConfirmedGuests);

    } catch (error: any) {
      showError(error.message || "Erro ao carregar convidados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGuests();
    }
  }, [isOpen, gameId, isAdmin, userId]);

  const handleAddGuest = async () => {
    if (!selectedGuestId) {
      showError("Selecione um convidado para adicionar.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('games_guest_players')
        .insert({
          game_id: gameId,
          guest_player_id: parseInt(selectedGuestId),
        });
      if (error) throw error;
      showSuccess("Convidado adicionado com sucesso!");
      setSelectedGuestId(null);
      await fetchGuests();
    } catch (error: any) {
      if (error.code === '23505') {
        showError("Este convidado já foi adicionado ao jogo.");
      } else {
        showError(error.message || "Erro ao adicionar convidado.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGuest = async (gamesGuestPlayersId: number, guestName: string) => {
    if (confirm(`Tem certeza que deseja remover o convidado "${guestName}" da lista?`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('games_guest_players')
          .delete()
          .eq('id', gamesGuestPlayersId);
        if (error) throw error;
        showSuccess("Convidado removido com sucesso!");
        await fetchGuests();
      } catch (error: any) {
        showError(error.message || "Erro ao remover convidado.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onPresenceChange();
    }
  };

  const availableGuests = allGuests.filter(
    guest => !confirmedGuests.some(cg => cg.id === guest.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled || isBlocked || isSuspended}>
                <UserPlus className="h-4 w-4 mr-2" />
                Gerenciar Convidados
              </Button>
            </DialogTrigger>
          </div>
        </TooltipTrigger>
        {isSuspended && (
          <TooltipContent>
            <p>Você está suspenso e não pode gerenciar convidados.</p>
          </TooltipContent>
        )}
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Jogadores Convidados</DialogTitle>
          <DialogDescription>
            Adicione ou remova convidados para este jogo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h4 className="font-medium mb-2">Adicionar Convidado</h4>
            <div className="flex items-center gap-2">
              <Select onValueChange={setSelectedGuestId} value={selectedGuestId || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um convidado" />
                </SelectTrigger>
                <SelectContent>
                  {availableGuests.length > 0 ? (
                    availableGuests.map(guest => (
                      <SelectItem key={guest.id} value={guest.id.toString()}>
                        {guest.full_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum convidado disponível.</div>
                  )}
                </SelectContent>
              </Select>
              <Button onClick={handleAddGuest} disabled={loading || !selectedGuestId}>
                Adicionar
              </Button>
            </div>
            {isBlocked && (
              <p className="text-sm text-destructive mt-2">Apenas mensalistas em dia podem adicionar convidados.</p>
            )}
          </div>
          <div>
            <h4 className="font-medium mb-2">Convidados Confirmados</h4>
            {loading && !confirmedGuests.length ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : confirmedGuests.length > 0 ? (
              <ScrollArea className="h-48 pr-4">
                <div className="space-y-2">
                  {confirmedGuests.map(guest => (
                    <div key={guest.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {guest.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{guest.full_name}</span>
                      </div>
                      {(isAdmin || guest.invited_by === userId) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveGuest(guest.games_guest_players_id, guest.full_name)} disabled={loading}>
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum convidado confirmado para este jogo.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GuestPresenceManager;