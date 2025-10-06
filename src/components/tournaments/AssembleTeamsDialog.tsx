"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusIcon, XIcon, LayoutGridIcon, StarIcon } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

interface TournamentPlayer {
  id: string; // UUID for profile, number for guest
  full_name: string;
  profile_picture_url?: string | null;
  type: 'profile' | 'guest';
  skill_level?: number;
}

interface TournamentTeam {
  id?: string; // Will be generated on save
  name: string;
  group_name?: string | null;
  players: TournamentPlayer[];
}

interface Tournament {
  id: string;
  name: string;
  type: 'copa' | 'campeonato';
  status: 'draft' | 'registration_open' | 'group_stage' | 'knockout_stage' | 'finished' | 'cancelled';
  num_teams: number;
  num_players_per_team: number;
  num_groups?: number | null;
}

interface AssembleTeamsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tournament: Tournament;
  allTournamentPlayers: TournamentPlayer[];
  existingTeams: TournamentTeam[] | null;
  onSaveTeams: (teams: TournamentTeam[]) => Promise<void>;
}

const teamNamesPool = [
  "Axé", "Dendê", "Barril", "Retado", "Lapada", 
  "Pivete", "Piriguetes", "Pivetes", "Berimbau", 
  "Tabaréus", "Buzão", "Nigrinhas", "Resenha", "Pelada",
  "Ginga", "Capoeira", "Samba", "Acarajé", "Vatapá", "Moqueca"
];

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

const AssembleTeamsDialog = ({ isOpen, onOpenChange, tournament, allTournamentPlayers, existingTeams, onSaveTeams }: AssembleTeamsDialogProps) => {
  const [manualTeams, setManualTeams] = useState<TournamentTeam[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<TournamentPlayer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateRandomTeamNames = useCallback((numTeams: number) => {
    const shuffledNames = [...teamNamesPool].sort(() => Math.random() - 0.5);
    return Array.from({ length: numTeams }, (_, i) => `Time ${shuffledNames[i] || (i + 1)}`);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (existingTeams && existingTeams.length > 0) {
        setManualTeams(existingTeams.map(team => ({
          ...team,
          players: team.players.map(p => ({ ...p, id: p.type === 'profile' ? p.id : p.id.toString() }))
        })));
        
        const assignedPlayerIds = new Set(existingTeams.flatMap(team => team.players.map(p => `${p.type}-${p.id}`)));
        const remainingUnassigned = allTournamentPlayers.filter(p => !assignedPlayerIds.has(`${p.type}-${p.id}`));
        setUnassignedPlayers(remainingUnassigned.sort((a, b) => a.full_name.localeCompare(b.full_name))); // Sort unassigned players
      } else {
        const newTeamNames = generateRandomTeamNames(tournament.num_teams);
        const initialTeams: TournamentTeam[] = newTeamNames.map((name, index) => {
          let groupName: string | null = null;
          if (tournament.type === 'campeonato' && tournament.num_groups && tournament.num_groups > 0) {
            groupName = `Grupo ${String.fromCharCode(65 + (index % tournament.num_groups))}`;
          }
          return { name, group_name: groupName, players: [] };
        });
        setManualTeams(initialTeams);
        setUnassignedPlayers(allTournamentPlayers.sort((a, b) => a.full_name.localeCompare(b.full_name))); // Sort all players initially
      }
    }
  }, [isOpen, tournament, allTournamentPlayers, existingTeams, generateRandomTeamNames]);

  const handleAddPlayerToNextTeam = (playerToAdd: TournamentPlayer) => {
    const targetTeamIndex = manualTeams.findIndex(
      team => team.players.length < tournament.num_players_per_team
    );

    if (targetTeamIndex === -1) {
      showError("Todos os times estão cheios ou não há times para preencher.");
      return;
    }

    setManualTeams(prevTeams => {
      const newTeams = [...prevTeams];
      newTeams[targetTeamIndex].players.push(playerToAdd);
      return newTeams;
    });

    setUnassignedPlayers(prev => prev.filter(p => !(p.id === playerToAdd.id && p.type === playerToAdd.type)));
  };

  const handleRemovePlayerFromTeam = (playerToRemove: TournamentPlayer, teamIndex: number) => {
    setManualTeams(prevTeams => {
      const newTeams = [...prevTeams];
      newTeams[teamIndex] = {
        ...newTeams[teamIndex],
        players: newTeams[teamIndex].players.filter(p => !(p.id === playerToRemove.id && p.type === playerToRemove.type)),
      };
      return newTeams;
    });
    setUnassignedPlayers(prev => [...prev, playerToRemove].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  };

  const handleSave = async () => {
    const totalAssignedPlayers = manualTeams.reduce((sum, team) => sum + team.players.length, 0);
    if (totalAssignedPlayers !== allTournamentPlayers.length) {
      showError("Nem todos os jogadores foram atribuídos aos times.");
      return;
    }
    
    const teamExceedsLimit = manualTeams.some(team => team.players.length > tournament.num_players_per_team);
    if (teamExceedsLimit) {
      showError(`Algum time excede o limite de ${tournament.num_players_per_team} jogadores.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTeams(manualTeams);
      showSuccess("Times montados e salvos com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving manual teams:", error);
      showError("Erro ao salvar os times montados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTeamColor = (teamName: string, index: number) => {
    const colors = ["bg-blue-600", "bg-yellow-400", "bg-green-500", "bg-red-500", "bg-purple-600", "bg-orange-500"];
    return colors[index % colors.length];
  };

  const allTeamsFull = manualTeams.every(team => team.players.length >= tournament.num_players_per_team);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGridIcon className="h-6 w-6" /> Montar Times Manualmente
          </DialogTitle>
          <DialogDescription>
            Adicione jogadores da lista de disponíveis. Eles serão alocados no primeiro time com vaga.
            Total: {allTournamentPlayers.length}. Times: {tournament.num_teams}. Jogadores/Time: {tournament.num_players_per_team}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow overflow-hidden py-4">
          <div className="md:col-span-1 border rounded-lg p-3 flex flex-col">
            <h3 className="font-semibold mb-3">Jogadores Disponíveis ({unassignedPlayers.length})</h3>
            <ScrollArea className="flex-grow pr-2">
              <div className="space-y-2">
                {unassignedPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Todos os jogadores foram atribuídos.</p>
                ) : (
                  unassignedPlayers.map(player => (
                    <div key={`${player.type}-${player.id}`} className="flex items-center justify-between p-2 border rounded-md bg-muted">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={player.profile_picture_url || ''} />
                          <AvatarFallback>{getInitials(player.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{player.full_name}</span>
                          {renderSkillStars(player.skill_level)}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleAddPlayerToNextTeam(player)}
                        disabled={allTeamsFull}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-2">
            {manualTeams.map((team, teamIndex) => (
              <div key={teamIndex} className="border rounded-lg p-3 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-4 h-4 rounded-full ${getTeamColor(team.name, teamIndex)}`}></div>
                  <h3 className="font-semibold">{team.name} ({team.players.length}/{tournament.num_players_per_team})</h3>
                </div>
                <ScrollArea className="flex-grow pr-2">
                  <div className="space-y-2 min-h-[100px]">
                    {team.players.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Nenhum jogador neste time.</p>
                    ) : (
                      team.players.map(player => (
                        <div key={`${player.type}-${player.id}`} className="flex items-center justify-between p-2 border rounded-md bg-secondary">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={player.profile_picture_url || ''} />
                              <AvatarFallback>{getInitials(player.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{player.full_name}</span>
                              {renderSkillStars(player.skill_level)}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemovePlayerFromTeam(player, teamIndex)}>
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || unassignedPlayers.length > 0 || manualTeams.some(team => team.players.length > tournament.num_players_per_team)}>
            {isSubmitting ? "Salvando..." : "Salvar Times Montados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssembleTeamsDialog;