"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShuffleIcon, UsersIcon, CheckCircle, RotateCcwIcon, LayoutGridIcon, StarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SelectPlayersDialog from "./SelectPlayersDialog";
import AssembleTeamsDialog from "./AssembleTeamsDialog";

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
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TournamentTeamGeneratorProps {
  tournament: Tournament;
  existingTeams: TournamentTeam[] | null;
  onTeamsGenerated: () => void;
}

const teamNames = [
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

export default function TournamentTeamGenerator({ 
  tournament,
  existingTeams,
  onTeamsGenerated,
}: TournamentTeamGeneratorProps) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedTeams, setGeneratedTeams] = useState<TournamentTeam[]>(existingTeams || []);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTeams, setPendingTeams] = useState<TournamentTeam[] | null>(null);
  const [isSelectPlayersDialogOpen, setIsSelectPlayersDialogOpen] = useState(false);
  const [isAssembleTeamsDialogOpen, setIsAssembleTeamsDialogOpen] = useState(false);
  const [selectedPlayersForTournament, setSelectedPlayersForTournament] = useState<TournamentPlayer[]>([]);

  useEffect(() => {
    setGeneratedTeams(existingTeams || []);
  }, [existingTeams]);

  useEffect(() => {
    if (existingTeams && existingTeams.length > 0) {
      const playersFromExistingTeams = existingTeams.flatMap(team => team.players);
      setSelectedPlayersForTournament(playersFromExistingTeams);
    } else {
      setSelectedPlayersForTournament([]);
    }
  }, [existingTeams]);


  const handleOpenSelectPlayersDialog = () => {
    setIsSelectPlayersDialogOpen(true);
  };

  const handlePlayersSelected = (players: TournamentPlayer[]) => {
    setSelectedPlayersForTournament(players);
  };

  const handleGenerateTeams = (playersToUse: TournamentPlayer[]) => {
    if (playersToUse.length < tournament.num_teams * tournament.num_players_per_team) {
      showError(`Você precisa de pelo menos ${tournament.num_teams * tournament.num_players_per_team} jogadores para formar ${tournament.num_teams} times de ${tournament.num_players_per_team} jogadores.`);
      return;
    }

    // Sort players by skill level (descending)
    const sortedPlayers = [...playersToUse].sort((a, b) => (b.skill_level || 1) - (a.skill_level || 1));
    const shuffledTeamNames = [...teamNames].sort(() => Math.random() - 0.5);
    
    const numTeams = tournament.num_teams;
    const newTeams: TournamentTeam[] = Array.from({ length: numTeams }, (_, i) => {
      let groupName: string | null = null;
      if (tournament.type === 'campeonato' && tournament.num_groups && tournament.num_groups > 0) {
        groupName = `Grupo ${String.fromCharCode(65 + (i % tournament.num_groups))}`; // A, B, C...
      }
      return {
        name: `Time ${shuffledTeamNames[i] || (i + 1)}`,
        group_name: groupName,
        players: [],
      };
    });

    // Distribute players to balance skill levels using a snake draft approach
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      let teamIndex;
      if (Math.floor(i / numTeams) % 2 === 0) { // Forward direction
        teamIndex = i % numTeams;
      } else { // Backward direction
        teamIndex = numTeams - 1 - (i % numTeams);
      }
      newTeams[teamIndex].players.push(player);
    }
    
    setPendingTeams(newTeams);
    setIsConfirmOpen(true);
  };

  const saveTeamsToDatabase = async (teamsToSave: TournamentTeam[]) => {
    setLoading(true);
    try {
      // Delete existing teams and players for this tournament
      await supabase.from('tournament_teams').delete().eq('tournament_id', tournament.id);
      await supabase.from('tournament_matches').delete().eq('tournament_id', tournament.id);


      // Insert new teams
      const { data: insertedTeams, error: teamsError } = await supabase
        .from('tournament_teams')
        .insert(teamsToSave.map(team => ({
          tournament_id: tournament.id,
          name: team.name,
          group_name: team.group_name,
        })))
        .select();

      if (teamsError) throw teamsError;

      // Insert players for each new team
      const teamPlayersInserts = insertedTeams.flatMap(team => {
        const originalTeam = teamsToSave.find(pt => pt.name === team.name && pt.group_name === team.group_name);
        if (!originalTeam) return [];

        return originalTeam.players.map(player => ({
          tournament_team_id: team.id,
          player_id: player.type === 'profile' ? player.id : null,
          guest_player_id: player.type === 'guest' ? parseInt(player.id) : null,
        }));
      });

      const { error: teamPlayersError } = await supabase
        .from('tournament_team_players')
        .insert(teamPlayersInserts);

      if (teamPlayersError) throw teamPlayersError;

      // --- Generate Matches ---
      const matchesToInsert: any[] = [];
      if (tournament.type === 'copa') {
        // Knockout logic (first round only for simplicity)
        const numTeams = insertedTeams.length;
        if (numTeams < 2) {
            throw new Error("Não há times suficientes para gerar um mata-mata.");
        }
        
        let roundName = '';
        if (numTeams === 2) roundName = 'Final';
        else if (numTeams === 4) roundName = 'Semi-final';
        else if (numTeams === 8) roundName = 'Quarter-final';
        else if (numTeams === 16) roundName = 'Round of 16';
        else if (numTeams === 32) roundName = 'Round of 32';
        else roundName = `Round of ${numTeams}`; // Fallback for non-standard numbers

        for (let i = 0; i < numTeams / 2; i++) {
            const team1 = insertedTeams[i * 2];
            const team2 = insertedTeams[i * 2 + 1];
            matchesToInsert.push({
                tournament_id: tournament.id,
                round: roundName,
                match_number: i + 1,
                team1_id: team1.id,
                team2_id: team2.id,
                status: 'scheduled',
            });
        }
      } else if (tournament.type === 'campeonato' && tournament.num_groups && tournament.num_groups > 0) {
          // Group stage logic
          const groups: { [key: string]: TournamentTeam[] } = {};
          insertedTeams.forEach(team => {
              if (team.group_name) {
                  if (!groups[team.group_name]) {
                      groups[team.group_name] = [];
                  }
                  groups[team.group_name].push(team);
              }
          });

          for (const groupName in groups) {
              const groupTeams = groups[groupName];
              for (let i = 0; i < groupTeams.length; i++) {
                  for (let j = i + 1; j < groupTeams.length; j++) {
                      matchesToInsert.push({
                          tournament_id: tournament.id,
                          round: groupName, // Round name is the group name
                          match_number: matchesToInsert.filter(m => m.round === groupName).length + 1,
                          team1_id: groupTeams[i].id,
                          team2_id: groupTeams[j].id,
                          status: 'scheduled',
                      });
                  }
              }
          }
      }

      if (matchesToInsert.length > 0) {
          const { error: matchesError } = await supabase
              .from('tournament_matches')
              .insert(matchesToInsert);
          if (matchesError) throw matchesError;
      }
      // --- End Generate Matches ---

      // Update tournament status to 'registration_open' if it was 'draft'
      await supabase.from('tournaments').update({ status: 'registration_open' }).eq('id', tournament.id);

      showSuccess("Times e chaveamento gerados com sucesso!");
      setGeneratedTeams(teamsToSave);
      onTeamsGenerated(); // Notify parent component to refetch
      setIsConfirmOpen(false);
      setPendingTeams(null);
    } catch (error: any) {
      showError(error.message || "Erro ao salvar os times sorteados.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGeneration = async () => {
    if (!pendingTeams) return;
    await saveTeamsToDatabase(pendingTeams);
  };

  const handleSaveManualTeams = async (manualTeams: TournamentTeam[]) => {
    await saveTeamsToDatabase(manualTeams);
    setIsAssembleTeamsDialogOpen(false);
  };

  const getTeamColor = (teamName: string, index: number) => {
    const colors = ["bg-blue-600", "bg-yellow-400", "bg-green-500", "bg-red-500", "bg-purple-600", "bg-orange-500"];
    return colors[index % colors.length];
  };

  const hasBeenGenerated = generatedTeams && generatedTeams.length > 0;
  const maxPlayersAllowed = tournament.num_teams * tournament.num_players_per_team;

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Times do Torneio</CardTitle>
          <CardDescription>Aguardando o administrador gerar os times.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasBeenGenerated ? (
            <p className="text-muted-foreground">Os times já foram gerados.</p>
          ) : (
            <p className="text-muted-foreground">Os times ainda não foram gerados para este torneio.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={hasBeenGenerated ? "border-green-500" : "border-primary"}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${hasBeenGenerated ? "text-green-500" : "text-primary"}`}>
            {hasBeenGenerated ? <CheckCircle className="h-5 w-5" /> : <ShuffleIcon className="h-5 w-5" />}
            {hasBeenGenerated ? "Times Gerados" : "Gerar Times"}
          </CardTitle>
          <CardDescription>
            {hasBeenGenerated 
              ? "Os times para este torneio já foram definidos. Gere novamente para um novo sorteio."
              : `Gere ${tournament.num_teams} times com ${tournament.num_players_per_team} jogadores cada.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-primary" />
                <span>{selectedPlayersForTournament.length} jogadores inscritos</span>
              </div>
              <Button 
                onClick={handleOpenSelectPlayersDialog}
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? "Carregando..." : (selectedPlayersForTournament.length > 0 ? "Re-selecionar Jogadores" : "Selecionar Jogadores")}
              </Button>
            </div>
            
            {selectedPlayersForTournament.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button 
                  onClick={() => handleGenerateTeams(selectedPlayersForTournament)}
                  disabled={loading || selectedPlayersForTournament.length < tournament.num_teams * tournament.num_players_per_team}
                  className="flex-1"
                >
                  <ShuffleIcon className="h-4 w-4 mr-2" /> Sortear Times
                </Button>
                <Button 
                  onClick={() => setIsAssembleTeamsDialogOpen(true)}
                  disabled={loading || selectedPlayersForTournament.length < tournament.num_teams * tournament.num_players_per_team}
                  variant="outline"
                  className="flex-1"
                >
                  <LayoutGridIcon className="h-4 w-4 mr-2" /> Montar Times Manualmente
                </Button>
              </div>
            )}

            {generatedTeams.length > 0 && (
              <div className="space-y-4 mt-6">
                {generatedTeams.map((team, teamIndex) => (
                  <div key={team.id || teamIndex} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full ${getTeamColor(team.name, teamIndex)}`}></div>
                      <h3 className="font-medium">{team.name}</h3>
                      {team.group_name && <Badge variant="outline">{team.group_name}</Badge>}
                      <Badge variant="secondary">{team.players.length} jogadores</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {team.players.map((player, playerIndex) => (
                        <div key={player.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={player.profile_picture_url || ''} />
                            <AvatarFallback className="text-xs">
                              {getInitials(player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs truncate">{player.full_name}</span>
                            {renderSkillStars(player.skill_level)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasBeenGenerated ? "Gerar Novamente os Times?" : "Confirmar Geração de Times?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasBeenGenerated 
                ? "Esta ação irá descartar os times e o chaveamento anteriores e criar uma nova distribuição. Deseja continuar?"
                : "Esta ação irá gerar os times e o chaveamento para o torneio. Deseja continuar?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGeneration}>
              Confirmar e Gerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SelectPlayersDialog
        isOpen={isSelectPlayersDialogOpen}
        onOpenChange={setIsSelectPlayersDialogOpen}
        onPlayersSelected={handlePlayersSelected}
        initialSelectedPlayers={selectedPlayersForTournament}
        tournamentId={tournament.id}
        maxPlayersAllowed={maxPlayersAllowed}
      />

      <AssembleTeamsDialog
        isOpen={isAssembleTeamsDialogOpen}
        onOpenChange={setIsAssembleTeamsDialogOpen}
        tournament={tournament}
        allTournamentPlayers={selectedPlayersForTournament}
        existingTeams={generatedTeams}
        onSaveTeams={handleSaveManualTeams}
      />
    </>
  );
}