"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  full_name: string;
}

interface PlayerPresenceManagerProps {
  gameId: number;
  confirmedPlayerIds: string[];
  onPresenceChange: () => void;
}

const PlayerPresenceManager = ({ gameId, confirmedPlayerIds, onPresenceChange }: PlayerPresenceManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Profile[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const { gameTermSingular } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const fetchPlayers = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('is_deleted', false) // Apenas jogadores ativos
            .order('full_name');
          if (error) throw error;
          setAllPlayers(data || []);
        } catch (error: any) {
          showError(error.message || "Erro ao carregar jogadores.");
        } finally {
          setLoading(false);
        }
      };
      fetchPlayers();
    }
  }, [isOpen]);

  const handleAddPlayer = async () => {
    if (!selectedPlayerId) {
      showError("Selecione um jogador para adicionar.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('games_players')
        .insert({
          game_id: gameId,
          player_id: selectedPlayerId,
        });
      if (error) throw error;
      showSuccess("Jogador adicionado com sucesso!");
      setSelectedPlayerId(null);
      onPresenceChange();
      setIsOpen(false);
    } catch (error: any) {
      if (error.code === '23505') {
        showError("Este jogador já foi adicionado ao jogo.");
      } else {
        showError(error.message || "Erro ao adicionar jogador.");
      }
    } finally {
      setLoading(false);
    }
  };

  const availablePlayers = allPlayers.filter(
    player => !confirmedPlayerIds.includes(player.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Jogador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Jogador ao {gameTermSingular}</DialogTitle>
          <DialogDescription>
            Selecione um jogador cadastrado para adicionar à lista de presença.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Select onValueChange={setSelectedPlayerId} value={selectedPlayerId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um jogador" />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers.length > 0 ? (
                  availablePlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.full_name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">Todos os jogadores já foram adicionados.</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddPlayer} disabled={loading || !selectedPlayerId}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerPresenceManager;