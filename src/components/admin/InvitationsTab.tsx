"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SendIcon, Trash2Icon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvitedUser {
  id: string;
  email: string;
  invited_at: string;
  full_name: string;
}

const InvitationsTab = () => {
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteeName, setInviteeName] = useState("");
  const [inviteePlayerType, setInviteePlayerType] = useState("linha");

  const fetchInvitedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_invited_users');
      if (error) throw error;
      setInvitedUsers(data || []);
    } catch (error: any) {
      showError(error.message || "Erro ao buscar convites pendentes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitedUsers();
  }, []);

  const handleInvite = async () => {
    if (!inviteeEmail || !inviteeName) {
      showError("Nome e e-mail são obrigatórios.");
      return;
    }
    setIsInviting(true);
    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: {
          inviteeEmail,
          initialProfileData: {
            full_name: inviteeName,
            player_type: inviteePlayerType,
            is_mensalista: false, // Invited users start as diaristas by default
          },
        },
      });
      if (error) throw error;
      showSuccess(`Convite enviado para ${inviteeEmail}!`);
      setInviteeEmail("");
      setInviteeName("");
      fetchInvitedUsers();
    } catch (error: any) {
      showError(error.message || "Erro ao enviar convite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (userId: string, userEmail: string) => {
    if (!confirm(`Tem certeza que deseja revogar o convite para ${userEmail}?`)) return;
    setIsRevoking(userId);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userIdToDelete: userId },
      });
      if (error) throw error;
      showSuccess("Convite revogado com sucesso!");
      fetchInvitedUsers();
    } catch (error: any) {
      showError(error.message || "Erro ao revogar convite.");
    } finally {
      setIsRevoking(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Convidar Novo Jogador</CardTitle>
          <CardDescription>
            Envie um convite por e-mail para um novo jogador se juntar ao seu Baba.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invitee-name">Nome Completo</Label>
              <Input id="invitee-name" value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} placeholder="Nome do Jogador" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitee-email">E-mail</Label>
              <Input id="invitee-email" type="email" value={inviteeEmail} onChange={(e) => setInviteeEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invitee-player-type">Posição Preferencial</Label>
            <Select onValueChange={setInviteePlayerType} value={inviteePlayerType}>
              <SelectTrigger id="invitee-player-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linha">Linha</SelectItem>
                <SelectItem value="goleiro">Goleiro</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={isInviting}>
            {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
            {isInviting ? "Enviando..." : "Enviar Convite"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convites Pendentes</CardTitle>
          <CardDescription>
            Estes usuários foram convidados mas ainda não completaram o cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Convidado há</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
              ) : invitedUsers.length > 0 ? (
                invitedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatDistanceToNow(new Date(user.invited_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleRevoke(user.id, user.email || '')} disabled={isRevoking === user.id}>
                        {isRevoking === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center">Nenhum convite pendente.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationsTab;