"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersIcon } from "lucide-react";
import TournamentMatchCard, { Match } from "./TournamentMatchCard"; // Importar o novo componente

interface Team {
  id: string;
  name: string;
  group_name: string;
}

interface Arena {
  id: number;
  name: string;
}

interface GroupStageDisplayProps {
  teams: Team[];
  matches: Match[]; // Passar as partidas
  arenas: Arena[]; // Passar a lista de arenas
  numGroups: number;
  onMatchUpdate: () => void; // Callback para atualizar a lista de partidas
}

const GroupStageDisplay = ({ teams, matches, arenas, numGroups, onMatchUpdate }: GroupStageDisplayProps) => {
  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fase de Grupos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Os times ainda não foram gerados para este torneio.</p>
        </CardContent>
      </Card>
    );
  }

  const groups: { [key: string]: Team[] } = {};
  teams.forEach(team => {
    if (team.group_name) {
      if (!groups[team.group_name]) {
        groups[team.group_name] = [];
      }
      groups[team.group_name].push(team);
    }
  });

  const sortedGroupNames = Object.keys(groups).sort();

  const matchesByGroup: { [key: string]: Match[] } = {};
  matches.forEach(match => {
    if (!matchesByGroup[match.round]) {
      matchesByGroup[match.round] = [];
    }
    matchesByGroup[match.round].push(match);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" />
          Fase de Grupos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedGroupNames.length === 0 ? (
          <p className="text-muted-foreground">Nenhum grupo formado ainda.</p>
        ) : (
          sortedGroupNames.map(groupName => (
            <div key={groupName} className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">{groupName}</h3>
              <div className="space-y-4">
                {matchesByGroup[groupName]?.sort((a, b) => a.match_number - b.match_number).map(match => (
                  <TournamentMatchCard
                    key={match.id}
                    match={match}
                    teams={teams}
                    arenas={arenas}
                    onUpdate={onMatchUpdate}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default GroupStageDisplay;