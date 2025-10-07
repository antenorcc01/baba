"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SearchIcon, StarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface TournamentPlayer {
  id: string; // UUID for profile, number for guest
  full_name: string;
  profile_picture_url?: string | null;
  type: 'profile' | 'guest';
  skill_level?: number;
}

interface SelectPlayersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPlayersSelected: (selectedPlayers: TournamentPlayer[]) => void;
  initialSelectedPlayers: TournamentPlayer[];
  tournamentId: string;
  maxPlayersAllowed: number;
}

const getInitials = (name: string) => {
  if (!name) return "?";
  const names = name.split(" ");
  if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const renderSkillStars = (level: number | undefined) => {
  const stars = [];
  for (let i = 1; i <= 3; i++) {
    stars.push(
      <StarIcon 
        key={i} 
        className={`h-3 w-3 ${i <= (level || 1) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const SelectPlayersDialog = ({ isOpen, onOpenChange, onPlayersSelected, initialSelectedPlayers, tournamentId, maxPlayersAllowed }: SelectPlayersDialogProps) => {
  const { profile } = useAuth();
  const [allAvailablePlayers, setAllAvailablePlayers] = useState<TournamentPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<TournamentPlayer[]>(initialSelectedPlayers);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      const fetchPlayersAndRegistrations = async () => {
        setLoading(true);
        try {
          // Fetch all eligible players (not deleted, not suspended)
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, profile_picture_url, skill_level')
            .eq('is_deleted', false)
            .eq('is_suspended', false);
          if (profilesError) throw profilesError;

          const { data: guests, error: guestsError } = await supabase
            .from('guest_players')
            .select('id, full_name, skill_level')
            .eq('is_deleted', false)
            .eq('is_suspended', false);
          if (guestsError) throw guestsError;

          const mappedProfiles: TournamentPlayer[] = (profiles || []).map(p => ({ ...p, type: 'profile' }));
          const mappedGuests: TournamentPlayer[] = (guests || []).map(g => ({ ...g, id: g.id.toString(), type: 'guest' }));

          const allEligible = [...mappedProfiles, ...mappedGuests].sort((a, b) => a.full_name.localeCompare(b.full_name));
          setAllAvailablePlayers(allEligible);

          // Fetch existing registrations for this tournament
          const { data: registrations, error: registrationsError } = await supabase
            .from('tournament_registrations')
            .select('player_id, guest_player_id')
            .eq('tournament_id', tournamentId);
          if (registrationsError) throw registrationsError;

          const registeredPlayerKeys = new Set<string>();
          registrations?.forEach(reg => {
            if (reg.player_id) registeredPlayerKeys.add(`profile-${reg.player_id}`);
            if (reg.guest_player_id) registeredPlayerKeys.add(`guest-${reg.guest_player_id}`);
          });

          // Pre-select players who are already registered
          const preSelected = allEligible.filter(p => {
            const playerIdKey = p.type === 'profile' ? `profile-${p.id}` : `guest-${p.id}`;
            return registeredPlayerKeys.has(playerIdKey);
          });
          setSelectedPlayers(preSelected);

        } catch (error: any) {
          showError(error.message || "Erro ao carregar jogadores e convidados.");
        } finally {
          setLoading(false);
        }
      };
      fetchPlayersAndRegistrations();
    }
  }, [isOpen, tournamentId]);

  const handleTogglePlayer = (player: TournamentPlayer) => {
    setSelectedPlayers(prev => {
      const isAlreadySelected = prev.some(p => p.id === player.id && p.type === player.type);

      if (isAlreadySelected) {
        return prev.filter(p => !(p.id === player.id && p.type === player.type));
      } else {
        if (prev.length >= maxPlayersAllowed) {
          showError(`Limite de ${maxPlayersAllowed} jogadores atingido para este torneio.`);
          return prev; // Não adiciona o jogador se o limite for atingido
        }
        return [...prev, player];
      }
    });
  };

  const handleConfirm = async () => {
    if (selectedPlayers.length > maxPlayersAllowed) {
      showError(`Você selecionou ${selectedPlayers.length} jogadores, mas o limite é de ${maxPlayersAllowed}.`);
      return;
    }

    setLoading(true);
    try {
      // Fetch current registrations to determine what to insert/delete
      const { data: currentRegistrations, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('id, player_id, guest_player_id')
        .eq('tournament_id', tournamentId);
      if (fetchError) throw fetchError;

      const currentRegisteredMap = new Map<string, string>(); // Key: `type-id`, Value: registration_id
      currentRegistrations?.forEach(reg => {
        if (reg.player_id) currentRegisteredMap.set(`profile-${reg.player_id}`, reg.id);
        if (reg.guest_player_id) currentRegisteredMap.set(`guest-${reg.guest_player_id}`, reg.id);
      });

      const toInsert: { tournament_id: string; player_id?: string; guest_player_id?: number; baba_id: string | null }[] = [];
      const toDeleteIds: string[] = [];

      // Determine insertions
      selectedPlayers.forEach(player => {
        const playerKey = `${player.type}-${player.id}`;
        if (!currentRegisteredMap.has(playerKey)) {
          toInsert.push({
            tournament_id: tournamentId,
            player_id: player.type === 'profile' ? player.id : undefined,
            guest_player_id: player.type === 'guest' ? parseInt(player.id) : undefined,
            baba_id: profile?.baba_id || null,
          });
        }
      });

      // Determine deletions
      currentRegisteredMap.forEach((regId, playerKey) => {
        const [type, id] = playerKey.split('-');
        if (!selectedPlayers.some(p => p.id === id && p.type === type)) {
          toDeleteIds.push(regId);
        }
      });

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('tournament_registrations').insert(toInsert);
        if (insertError) throw insertError;
      }

      if (toDeleteIds.length > 0) {
        const { error: deleteError } = await supabase.from('tournament_registrations').delete().in('id', toDeleteIds);
        if (deleteError) throw deleteError;
      }

      showSuccess("Inscrições atualizadas com sucesso!");
      onPlayersSelected(selectedPlayers); // Pass the final selected players to the parent
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar inscrições.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = allAvailablePlayers.filter(player =>
    player.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isConfirmButtonDisabled = loading || selectedPlayers.length > maxPlayersAllowed;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Jogadores para o Torneio</DialogTitle>
          <DialogDescription>
            Escolha os jogadores que participarão deste torneio. Apenas os selecionados serão sorteados para os times.
            Limite: {maxPlayersAllowed} jogadores.
          </DialogDescription>
        </DialogHeader>
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar jogador..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-grow h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum jogador encontrado.</p>
          ) : (
            <div className="space-y-3">
              {filteredPlayers.map(player => (
                <div key={`${player.type}-${player.id}`} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.profile_picture_url || ''} />
                      <AvatarFallback>{getInitials(player.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium">{player.full_name}</span>
                      <div className="flex items-center gap-1">
                        <span className="ml-2 text-xs text-muted-foreground capitalize">({player.type === 'profile' ? 'Jogador' : 'Convidado'})</span>
                        {renderSkillStars(player.skill_level)}
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedPlayers.some(p => p.id === player.id && p.type === player.type)}
                    onCheckedChange={() => handleTogglePlayer(player)}
                    disabled={selectedPlayers.length >= maxPlayersAllowed && !selectedPlayers.some(p => p.id === player.id && p.type === player.type)}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isConfirmButtonDisabled}>Confirmar Seleção ({selectedPlayers.length})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectPlayersDialog;