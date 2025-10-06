"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import { Plus, Search, Edit, Trash2, MapPin, ExternalLink } from "lucide-react";
import ArenaDialog from "@/components/arenas/ArenaDialog";

interface Arena {
  id: number;
  name: string;
  address: string;
  type: string;
  price: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

const fetchArenas = async (): Promise<Arena[]> => {
  const { data, error } = await supabase
    .from("arenas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Arena[];
};

const deleteArena = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("arenas")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
};

const ArenasTab = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArena, setEditingArena] = useState<Arena | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [arenaToDelete, setArenaToDelete] = useState<Arena | null>(null);

  const { data: arenas, isLoading, error } = useQuery<Arena[]>({
    queryKey: ["arenas"],
    queryFn: fetchArenas,
  });

  const deleteArenaMutation = useMutation({
    mutationFn: deleteArena,
    onSuccess: () => {
      showSuccess("Arena excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["arenas"] });
      setIsDeleteDialogOpen(false);
      setArenaToDelete(null);
    },
    onError: (error) => {
      showError(`Erro ao excluir arena: ${error.message}`);
    },
  });

  const filteredArenas = arenas?.filter((arena) =>
    arena.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arena.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditArena = (arena: Arena) => {
    setEditingArena(arena);
    setIsDialogOpen(true);
  };

  const handleDeleteArena = (arena: Arena) => {
    setArenaToDelete(arena);
    setIsDeleteDialogOpen(true);
  };

  const handleViewOnMap = (arena: Arena) => {
    if (arena.address) {
      const encodedAddress = encodeURIComponent(arena.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      showError("Endereço não disponível para esta arena.");
    }
  };

  const handleConfirmDelete = () => {
    if (arenaToDelete) {
      deleteArenaMutation.mutate(arenaToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex items-center justify-center text-center py-10">
        <p className="text-red-500">Erro ao carregar arenas: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar arenas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Arena
          </Button>
        )}
      </div>

      {filteredArenas && filteredArenas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArenas.map((arena) => (
            <Card key={arena.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {arena.image_url ? (
                  <div className="relative h-48 bg-muted">
                    <img
                      src={arena.image_url}
                      alt={arena.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{arena.name}</h3>
                    <Badge variant="outline">{arena.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {arena.address}
                  </p>
                  {arena.price && (
                    <p className="text-sm font-medium">
                      R$ {arena.price.toFixed(2)}
                    </p>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewOnMap(arena)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver Mapa
                    </Button>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditArena(arena)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteArena(arena)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhuma arena encontrada." : "Nenhuma arena cadastrada."}
          </p>
        </div>
      )}

      <ArenaDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        arena={editingArena}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["arenas"] });
          setEditingArena(null);
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a arena "{arenaToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArenasTab;