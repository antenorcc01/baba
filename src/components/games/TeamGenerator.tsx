"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShuffleIcon, UsersIcon, CheckCircle, RotateCcwIcon, StarIcon } from "lucide-react";
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
import { showError } from "@/utils/toast";

interface Player {
  id: string;
  full_name: string;
  profile_picture_url?: string;
  skill_level?: number;
  type: 'profile' | 'guest';
}

interface Team {
  name: string;
  players: Player[];
}

interface TeamGeneratorProps {
  currentPlayers: Player[];
  savedTeams: Team[] | null;
  onSaveTeams: (teams: Team[]) => Promise<void>;
  isPlayerListUnchanged: boolean;
  isAdmin: boolean;
}

const teamNames = [
  "Axé", "Dendê", "Barril", "Retado", "Lapada", 
  "Pivete", "Piriguetes", "Pivetes", "Berimbau", 
  "Tabaréus", "Buz", "Nigrinhas"
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

export default function TeamGenerator({ 
  currentPlayers, 
  savedTeams,
  onSaveTeams,
  isPlayerListUnchanged,
  isAdmin
}: TeamGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>(savedTeams || []);
  const [playersPerTeam, setPlayersPerTeam] = useState('5');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingTeams, setPendingTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    setTeams(savedTeams || []);
  }, [savedTeams]);

  const handleGenerateClick = () => {
    const numPlayersPerTeam = parseInt(playersPerTeam);
    if (currentPlayers.length < numPlayersPerTeam) {
      showError(`Precisa de pelo menos ${numPlayersPerTeam} jogadores para formar um time.`);
      return;
    }

    // Sort players by skill level (descending)
    const sortedPlayers = [...currentPlayers].sort((a, b) => (b.skill_level || 1) - (a.skill_level || 1));
    const shuffledTeamNames = [...teamNames].sort(() => Math.random() - 0.5);
    
    const numTeams = Math.floor(sortedPlayers.length / numPlayersPerTeam);
    const newTeams: Team[] = Array.from({ length: numTeams }, (_, i) => ({
      name: `Time ${shuffledTeamNames[i] || (i + 1)}`,
      players: [],
    }));

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

  const handleConfirmGeneration = async () => {
    if (!pendingTeams) return;
    setLoading(true);
    try {
      await onSaveTeams(pendingTeams);
    } catch (error) {
      console.error('Error saving teams:', error);
      showError("Erro ao salvar os times sorteados.");
    } finally {
      setLoading(false);
      setPendingTeams(null);
    }
  };

  const getTeamColor = (teamName: string, index: number) => {
    if (teamName === "Reservas") return "bg-gray-500";
    const colors = ["bg-blue-600", "bg-yellow-400", "bg-green-500", "bg-red-500"];
    return colors[index % colors.length];
  };

  const hasBeenGenerated = savedTeams && savedTeams.length > 0;

  return (
    <>
      <Card className={hasBeenGenerated ? "border-green-500" : "border-primary"}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${hasBeenGenerated ? "text-green-500" : "text-primary"}`}>
            {hasBeenGenerated ? <CheckCircle className="h-5 w-5" /> : <ShuffleIcon className="h-5 w-5" />}
            {hasBeenGenerated ? "Times Sorteados" : "Sortear Times"}
          </CardTitle>
          <CardDescription>
            {hasBeenGenerated 
              ? "Os times para este baba já foram definidos. Para sortear novamente, adicione ou remova jogadores da lista de confirmados."
              : "Crie times equilibrados automaticamente com base nos jogadores confirmados."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!hasBeenGenerated && isAdmin && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-primary" />
                  <span>{currentPlayers.length} jogadores confirmados</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-grow">
                    <Label htmlFor="players-per-team" className="sr-only">Jogadores por time</Label>
                    <Select value={playersPerTeam} onValueChange={setPlayersPerTeam}>
                      <SelectTrigger id="players-per-team">
                        <SelectValue placeholder="Jogadores por time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 2).map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} por time</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleGenerateClick}
                    disabled={loading || currentPlayers.length < 2}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {loading ? "Sorteando..." : "Sortear"}
                  </Button>
                </div>
              </div>
            )}
            
            {teams.length > 0 && (
              <div className="space-y-4">
                {teams.map((team, teamIndex) => (
                  <div key={teamIndex} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${getTeamColor(team.name, teamIndex)}`}></div>
                      <h3 className="font-medium">{team.name}</h3>
                      <Badge variant="secondary">{team.players.length} jogadores</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {team.players.map((player, playerIndex) => (
                        <div key={playerIndex} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={player.profile_picture_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs">{player.full_name}</span>
                            {renderSkillStars(player.skill_level)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasBeenGenerated && isAdmin && (
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label htmlFor="players-per-team-redo" className="text-sm">Jogadores por time</Label>
                  <Select value={playersPerTeam} onValueChange={setPlayersPerTeam} disabled={isPlayerListUnchanged}>
                    <SelectTrigger id="players-per-team-redo" className="w-full sm:w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 2).map(num => (
                        <SelectItem key={num} value={num.toString()}>{num} por time</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-block w-full sm:w-auto">
                        <Button 
                          onClick={handleGenerateClick}
                          disabled={isPlayerListUnchanged || loading}
                          variant="outline"
                          className="w-full"
                        >
                          <RotateCcwIcon className="h-4 w-4 mr-2" />
                          Refazer Sorteio
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {isPlayerListUnchanged && (
                      <TooltipContent>
                        <p>Adicione ou remova jogadores para sortear novamente.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasBeenGenerated ? "Refazer Sorteio de Times?" : "Confirmar Sorteio de Times?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasBeenGenerated 
                ? "A lista de jogadores mudou. Esta ação irá descartar o sorteio anterior e criar uma nova distribuição de times. Deseja continuar?"
                : "Esta ação irá sortear os times e salvar o resultado. Você só poderá sortear novamente se a lista de jogadores mudar. Deseja continuar?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGeneration}>
              Confirmar e Sortear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}