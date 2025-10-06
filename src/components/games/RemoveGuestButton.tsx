"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface RemoveGuestButtonProps {
  gameGuestPlayerId: number;
  gameId: number;
}

export default function RemoveGuestButton({ gameGuestPlayerId, gameId }: RemoveGuestButtonProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleRemove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("games_guest_players")
        .delete()
        .eq("id", gameGuestPlayerId);

      if (error) throw error;
      showSuccess("Convidado removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["game", gameId.toString()] });
    } catch (error: any) {
      showError(error.message || "Erro ao remover convidado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover Convidado?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover este convidado da lista de confirmados?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemove} disabled={loading}>
            {loading ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}