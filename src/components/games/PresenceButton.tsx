"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PresenceButtonProps {
  gameId: number;
  isConfirmed: boolean;
  isGameFull: boolean;
  isGameFinished: boolean;
  isSuspended: boolean;
  className?: string;
}

const PresenceButton = ({ gameId, isConfirmed, isGameFull, isGameFinished, isSuspended, className }: PresenceButtonProps) => {
  const { profile, gameTermSingular } = useAuth();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleConfirmPresence = async () => {
    if (!profile) {
      showError("Você precisa estar logado para confirmar presença.");
      return;
    }
    if (isGameFull) {
      showError(`O ${gameTermSingular.toLowerCase()} já está lotado.`);
      return;
    }
    if (isSuspended) {
      showError("Você está suspenso e não pode confirmar presença.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("games_players").insert({
      game_id: gameId,
      player_id: profile.id,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Presença confirmada!");
      queryClient.invalidateQueries({ queryKey: ['game', gameId.toString()] });
    }
    setLoading(false);
  };

  const handleCancelPresence = async () => {
    if (!profile) {
      showError("Você precisa estar logado para cancelar a presença.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("games_players")
      .delete()
      .match({ game_id: gameId, player_id: profile.id });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Presença cancelada.");
      queryClient.invalidateQueries({ queryKey: ['game', gameId.toString()] });
    }
    setLoading(false);
  };

  if (isGameFinished) {
    return <Button size="sm" disabled className={className}>{gameTermSingular} finalizado</Button>;
  }

  if (isConfirmed) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={loading} size="sm" variant="destructive" className={className}>
            {loading ? "Cancelando..." : "Cancelar Presença"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover sua presença deste {gameTermSingular.toLowerCase()}. Você poderá se inscrever novamente se houver vagas disponíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelPresence} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button onClick={handleConfirmPresence} disabled={loading || isGameFull || isSuspended} size="sm" className={className}>
      {loading ? "Confirmando..." : "Confirmar Presença"}
    </Button>
  );
};

export default PresenceButton;