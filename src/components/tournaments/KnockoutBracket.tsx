"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrophyIcon } from "lucide-react";
import TournamentMatchCard, { Match } from "./TournamentMatchCard"; // Importar o novo componente

interface Team {
  id: string;
  name: string;
}

interface Arena {
  id: number;
  name: string;
}

interface KnockoutBracketProps {
  teams: Team[];
  matches: Match[];
  arenas: Arena[]; // Passar a lista de arenas
  onMatchUpdate: () => void; // Callback para atualizar a lista de partidas
}

const KnockoutBracket = ({ teams, matches, arenas, onMatchUpdate }: KnockoutBracketProps) => {
  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chave de Mata-Mata</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Os times ainda não foram gerados para este torneio.</p>
        </CardContent>
      </Card>
    );
  }

  const rounds: { [key: string]: Match[] } = {};
  matches.forEach(match => {
    if (!rounds[match.round]) {
      rounds[match.round] = [];
    }
    rounds[match.round].push(match);
  });

  const roundOrderMap: { [key: string]: number } = {
    'Round of 32': 1,
    'Round of 16': 2,
    'Quarter-final': 3,
    'Semi-final': 4,
    'Final': 5,
  };

  const sortedRounds = Object.keys(rounds).sort((a, b) => {
    const orderA = roundOrderMap[a] || 99; // Default to high number for unknown rounds
    const orderB = roundOrderMap[b] || 99;
    return orderA - orderB;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-primary" />
          Chave de Mata-Mata
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex space-x-8 py-4">
          {sortedRounds.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma partida agendada ainda.</p>
          ) : (
            sortedRounds.map(roundName => (
              <div key={roundName} className="flex-shrink-0 w-64">
                <h3 className="font-bold text-lg mb-4 text-center">{roundName}</h3>
                <div className="space-y-4">
                  {rounds[roundName].sort((a, b) => a.match_number - b.match_number).map(match => (
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
        </div>
      </CardContent>
    </Card>
  );
};

export default KnockoutBracket;