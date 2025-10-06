"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UndoIcon, Trash2Icon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";

interface DeletedItem {
  id: string | number;
  full_name: string;
  deleted_at?: string; // Assuming there might be a timestamp for deletion
}

const AdminLixeira = () => {
  const [deletedPlayers, setDeletedPlayers] = useState<DeletedItem[]>([]);
  const [deletedGuests, setDeletedGuests] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  const fetchDeletedItems = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [playersRes, guestsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, updated_at').eq('is_deleted', true),
        supabase.from('guest_players').select('id, full_name, updated_at').eq('is_deleted', true)
      ]);

      if (playersRes.error) throw playersRes.error;
      if (guestsRes.error) throw guestsRes.error;

      setDeletedPlayers(playersRes.data.map(p => ({ ...p, id: p.id.toString(), deleted_at: p.updated_at })) || []);
      setDeletedGuests(guestsRes.data.map(g => ({ ...g, id: g.id, deleted_at: g.updated_at })) || []);
    } catch (error: any) {
      showError(error.message || "Erro ao carregar itens da lixeira");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedItems();
  }, [isAdmin]);

  const handleRestore = async (type: 'profile' | 'guest', id: string | number) => {
    const tableName = type === 'profile' ? 'profiles' : 'guest_players';
    const { error } = await supabase.from(tableName).update({ is_deleted: false }).eq('id', id);

    if (error) {
      showError(`Erro ao restaurar: ${error.message}`);
    } else {
      showSuccess("Item restaurado com sucesso!");
      fetchDeletedItems();
    }
  };

  const handlePermanentDelete = async (type: 'profile' | 'guest', id: string | number) => {
    if (!confirm("Esta ação é irreversível. Deseja excluir permanentemente?")) return;

    if (type === 'profile') {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userIdToDelete: id },
      });
      if (error) {
        showError(`Erro ao excluir jogador: ${error.message}`);
      } else {
        showSuccess("Jogador excluído permanentemente!");
        fetchDeletedItems();
      }
    } else {
      const { error } = await supabase.from('guest_players').delete().eq('id', id);
      if (error) {
        showError(`Erro ao excluir convidado: ${error.message}`);
      } else {
        showSuccess("Convidado excluído permanentemente!");
        fetchDeletedItems();
      }
    }
  };

  const renderTable = (items: DeletedItem[], type: 'profile' | 'guest') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
        ) : items.length > 0 ? (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.full_name}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(type, item.id)}>
                  <UndoIcon className="h-4 w-4 mr-2" /> Restaurar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(type, item.id)}>
                  <Trash2Icon className="h-4 w-4 mr-2" /> Excluir
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow><TableCell colSpan={2} className="text-center">Lixeira vazia</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lixeira</CardTitle>
        <CardDescription>Gerencie jogadores e convidados que foram excluídos. Você pode restaurá-los ou excluí-los permanentemente.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="players">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="players">Jogadores</TabsTrigger>
            <TabsTrigger value="guests">Convidados</TabsTrigger>
          </TabsList>
          <TabsContent value="players" className="mt-4">
            {renderTable(deletedPlayers, 'profile')}
          </TabsContent>
          <TabsContent value="guests" className="mt-4">
            {renderTable(deletedGuests, 'guest')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminLixeira;