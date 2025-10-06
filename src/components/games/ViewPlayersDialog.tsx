"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import RemovePlayerButton from "./RemovePlayerButton";
import RemoveGuestButton from "./RemoveGuestButton";

interface PlayerProfile {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
}

interface GuestPlayer {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

interface GamePlayer {
  id: number;
  player_id: string;
  profiles: PlayerProfile;
}

interface GameGuestPlayer {
  id: number;
  guest_player_id: number;
  guest_players: GuestPlayer;
}

interface Game {
  id: number;
  games_players: GamePlayer[];
  games_guest_players: GameGuestPlayer[];
}

interface ViewPlayersDialogProps {
  game: Game;
  className?: string;
}

const getInitials = (name: string) => {
  if (!name) return "?";
  const names = name.split(" ");
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function ViewPlayersDialog({ game, className }: ViewPlayersDialogProps) {
  const { profile } = useAuth();
  const allPlayers = [
    ...game.games_players.map(p => ({ ...p.profiles, type: 'player', gamePlayerId: p.id })),
    ...game.games_guest_players.map(g => ({ ...g.guest_players, type: 'guest', gameGuestPlayerId: g.id }))
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>Ver Jogadores</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Jogadores Confirmados</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          {allPlayers.length > 0 ? (
            allPlayers.map((player) => (
              <div key={`${player.type}-${player.id}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={player.profile_picture_url || player.avatar_url || ""} />
                    <AvatarFallback>{getInitials(player.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{player.full_name}</p>
                    {player.type === 'guest' && <Badge variant="secondary">Convidado</Badge>}
                  </div>
                </div>
                {profile?.role === 'admin' && (
                  player.type === 'player' ? (
                    <RemovePlayerButton gamePlayerId={player.gamePlayerId} gameId={game.id} />
                  ) : (
                    <RemoveGuestButton gameGuestPlayerId={player.gameGuestPlayerId} gameId={game.id} />
                  )
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <UserX className="mx-auto h-12 w-12" />
              <p className="mt-4">Nenhum jogador confirmado ainda.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}