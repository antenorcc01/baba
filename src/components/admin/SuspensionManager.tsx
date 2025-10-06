"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { EditIcon } from "lucide-react";

interface SuspendableEntity {
  id: string | number;
  full_name: string;
  is_suspended: boolean;
  suspension_end_date: string | null;
  suspension_reason: string | null;
  type: 'profile' | 'guest';
}

const SuspensionManager = () => {
  const [allEntities, setAllEntities] = useState<SuspendableEntity[]>([]);
  const [suspendedEntities, setSuspendedEntities] = useState<SuspendableEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionEndDate, setSuspensionEndDate] = useState<Date | undefined>();
  const [entityToRemoveSuspension, setEntityToRemoveSuspension] = useState<SuspendableEntity | null>(null);
  
  // Estados para edição
  const [editingEntity, setEditingEntity] = useState<SuspendableEntity | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, is_suspended, suspension_end_date, suspension_reason')
        .eq('is_deleted', false)
        .order('full_name');
      if (profilesError) throw profilesError;

      const { data: guests, error: guestsError } = await supabase
        .from('guest_players')
        .select('id, full_name, is_suspended, suspension_end_date, suspension_reason')
        .eq('is_deleted', false)
        .order('full_name');
      if (guestsError) throw guestsError;

      const mappedProfiles: SuspendableEntity[] = (profiles || []).map(p => ({ ...p, type: 'profile' }));
      const mappedGuests: SuspendableEntity[] = (guests || []).map(g => ({ ...g, type: 'guest' }));

      const combined = [...mappedProfiles, ...mappedGuests].sort((a, b) => a.full_name.localeCompare(b.full_name));
      setAllEntities(combined);
      setSuspendedEntities(combined.filter(e => e.is_suspended));
    } catch (error: any) {
      showError(error.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (editingEntity) {
      setEditReason(editingEntity.suspension_reason || "");
      setEditEndDate(editingEntity.suspension_end_date ? new Date(editingEntity.suspension_end_date + 'T00:00:00') : undefined);
    }
  }, [editingEntity]);

  const handleSuspend = async () => {
    if (!selectedEntityId || !suspensionReason) {
      showError("Selecione um jogador/convidado e informe o motivo da suspensão.");
      return;
    }
    setIsSubmitting(true);
    try {
      const parts = selectedEntityId.split('-');
      const type = parts[0];
      const entityId = type === 'profile' ? parts.slice(1).join('-') : parseInt(parts[1], 10);
      const tableName = type === 'profile' ? 'profiles' : 'guest_players';
      
      const { error } = await supabase
        .from(tableName)
        .update({
          is_suspended: true,
          suspension_reason: suspensionReason,
          suspension_end_date: suspensionEndDate ? suspensionEndDate.toISOString().split('T')[0] : null,
        })
        .eq('id', entityId);

      if (error) throw error;
      showSuccess("Suspensão aplicada com sucesso!");
      setSelectedEntityId("");
      setSuspensionReason("");
      setSuspensionEndDate(undefined);
      fetchEntities();
    } catch (error: any) {
      showError(error.message || "Erro ao aplicar suspensão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSuspension = async () => {
    if (!editingEntity) return;
    setIsSubmitting(true);
    try {
      const tableName = editingEntity.type === 'profile' ? 'profiles' : 'guest_players';
      const { error } = await supabase
        .from(tableName)
        .update({
          suspension_reason: editReason,
          suspension_end_date: editEndDate ? editEndDate.toISOString().split('T')[0] : null,
        })
        .eq('id', editingEntity.id);

      if (error) throw error;
      showSuccess("Suspensão atualizada com sucesso!");
      setEditingEntity(null);
      fetchEntities();
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar suspensão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSuspension = async () => {
    if (!entityToRemoveSuspension) return;
    try {
      const tableName = entityToRemoveSuspension.type === 'profile' ? 'profiles' : 'guest_players';
      const { error } = await supabase
        .from(tableName)
        .update({
          is_suspended: false,
          suspension_reason: null,
          suspension_end_date: null,
        })
        .eq('id', entityToRemoveSuspension.id);

      if (error) throw error;
      showSuccess("Suspensão removida com sucesso!");
      fetchEntities();
    } catch (error: any) {
      showError(error.message || "Erro ao remover suspensão.");
    } finally {
      setEntityToRemoveSuspension(null);
    }
  };

  const availableEntities = allEntities.filter(e => !e.is_suspended);

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Suspender Jogador ou Convidado</CardTitle>
            <CardDescription>Aplique uma suspensão, impedindo a participação nos jogos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger><SelectValue placeholder="Selecione um jogador ou convidado" /></SelectTrigger>
              <SelectContent>
                {availableEntities.map(e => (
                  <SelectItem key={`${e.type}-${e.id}`} value={`${e.type}-${e.id}`}>
                    {e.full_name} ({e.type === 'profile' ? 'Jogador' : 'Convidado'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Motivo da suspensão (ex: Cartão vermelho, conduta antidesportiva)" value={suspensionReason} onChange={e => setSuspensionReason(e.target.value)} />
            <DatePicker date={suspensionEndDate} setDate={setSuspensionEndDate} placeholder="Data de fim da suspensão (opcional)" />
            <Button onClick={handleSuspend} disabled={isSubmitting || !selectedEntityId || !suspensionReason}>
              {isSubmitting ? "Suspendendo..." : "Suspender"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Suspensos</CardTitle>
            <CardDescription>Jogadores e convidados que estão atualmente cumprindo suspensão.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fim da Suspensão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
                ) : suspendedEntities.length > 0 ? (
                  suspendedEntities.map(e => (
                    <TableRow key={`${e.type}-${e.id}`}>
                      <TableCell>{e.full_name}</TableCell>
                      <TableCell>{e.type === 'profile' ? 'Jogador' : 'Convidado'}</TableCell>
                      <TableCell>{e.suspension_reason}</TableCell>
                      <TableCell>{e.suspension_end_date ? format(new Date(e.suspension_end_date + 'T00:00:00'), 'dd/MM/yyyy') : 'Indefinido'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingEntity(e)}>
                          <EditIcon className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEntityToRemoveSuspension(e)}>Remover Suspensão</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center">Nenhum jogador ou convidado suspenso.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!entityToRemoveSuspension} onOpenChange={(open) => !open && setEntityToRemoveSuspension(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção de Suspensão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a suspensão de "<strong>{entityToRemoveSuspension?.full_name}</strong>". O jogador/convidado poderá participar dos jogos novamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSuspension}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Suspensão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Editando suspensão para: <strong>{editingEntity?.full_name}</strong></p>
            <Textarea 
              placeholder="Motivo da suspensão" 
              value={editReason} 
              onChange={e => setEditReason(e.target.value)} 
            />
            <DatePicker 
              date={editEndDate} 
              setDate={setEditEndDate} 
              placeholder="Data de fim da suspensão (opcional)" 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntity(null)}>Cancelar</Button>
            <Button onClick={handleUpdateSuspension} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SuspensionManager;