"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, SaveIcon, SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import PixConfigDialog from "@/components/admin/PixConfigDialog";

interface Profile {
  id: string;
  full_name: string;
  payment_status: 'pago' | 'pendente' | 'atrasado' | 'diarista';
  is_mensalista: boolean;
}

const PlayerPaymentStatus = () => {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [dueDate, setDueDate] = useState("10");
  const [monthlyFee, setMonthlyFee] = useState("50");
  const [dailyFee, setDailyFee] = useState("20");

  const [dbDueDate, setDbDueDate] = useState("10");
  const [dbMonthlyFee, setDbMonthlyFee] = useState("50");
  const [dbDailyFee, setDbDailyFee] = useState("20");

  const [isPixConfigOpen, setIsPixConfigOpen] = useState(false);

  useEffect(() => {
    const loadAndCheck = async () => {
      setLoading(true);
      try {
        const { data: playersData, error: playersError } = await supabase
          .from('profiles')
          .select('id, full_name, payment_status, is_mensalista')
          .order('full_name');
        if (playersError) throw playersError;

        const { data: settingsData, error: settingsError } = await supabase
          .from('group_settings')
          .select('setting_key, setting_value');
        if (settingsError) console.warn("Could not fetch settings. Using defaults.");

        const settings = settingsData?.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {} as Record<string, string>) || {};

        const currentDueDate = settings['payment_due_day'] || "10";
        const currentMonthlyFee = settings['monthly_fee_amount'] || "50";
        const currentDailyFee = settings['daily_fee_amount'] || "20";

        setPlayers(playersData || []);
        setDueDate(currentDueDate);
        setMonthlyFee(currentMonthlyFee);
        setDailyFee(currentDailyFee);
        setDbDueDate(currentDueDate);
        setDbMonthlyFee(currentMonthlyFee);
        setDbDailyFee(currentDailyFee);

        showSuccess("Verificando status de pagamento...", { duration: 2000 });

        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('player_id, payment_date')
          .eq('category', 'Mensalidade')
          .order('payment_date', { ascending: false });
        if (paymentsError) throw paymentsError;

        const latestPayments = new Map<string, string>();
        for (const payment of payments) {
          if (payment.player_id && !latestPayments.has(payment.player_id)) {
            latestPayments.set(payment.player_id, payment.payment_date);
          }
        }

        const today = new Date();
        const dueDateDay = parseInt(currentDueDate, 10);
        
        const updates: Promise<any>[] = [];

        for (const player of (playersData || [])) {
          if (!player.is_mensalista) continue;

          const lastPaymentDateStr = latestPayments.get(player.id);
          let newStatus: Profile['payment_status'] = 'atrasado';

          if (lastPaymentDateStr) {
            const lastPaymentDate = new Date(lastPaymentDateStr);
            if (lastPaymentDate.getFullYear() === today.getFullYear() && lastPaymentDate.getMonth() === today.getMonth()) {
              newStatus = 'pago';
            } else if (today.getDate() <= dueDateDay) {
              newStatus = 'pendente';
            }
          } else if (today.getDate() <= dueDateDay) {
            newStatus = 'pendente';
          }

          if (newStatus !== player.payment_status) {
            updates.push(
              supabase
                .from('profiles')
                .update({ payment_status: newStatus })
                .eq('id', player.id)
            );
          }
        }

        if (updates.length > 0) {
          await Promise.all(updates);
          showSuccess(`${updates.length} status de jogadores foram atualizados!`);
          
          const { data: updatedPlayers, error: updatedPlayersError } = await supabase
            .from('profiles')
            .select('id, full_name, payment_status, is_mensalista')
            .order('full_name');
          if (updatedPlayersError) throw updatedPlayersError;
          setPlayers(updatedPlayers || []);
        } else {
          showSuccess("Todos os status já estão atualizados.");
        }
        
      } catch (error: any) {
        showError(error.message || "Erro ao carregar e verificar jogadores.");
      } finally {
        setLoading(false);
      }
    };

    loadAndCheck();
  }, []);

  const handleSettingSave = async (key: string, value: string, dbSetter: (val: string) => void) => {
    try {
      const { error } = await supabase
        .from('group_settings')
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      dbSetter(value);
      showSuccess("Configuração atualizada com sucesso!");
    } catch (error: any) {
      showError(error.message || "Erro ao salvar configuração.");
    }
  };

  const handleStatusChange = async (playerId: string, newStatus: Profile['payment_status']) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ payment_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', playerId);

      if (error) throw error;
      
      showSuccess("Status do jogador atualizado com sucesso!");
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === playerId ? { ...p, payment_status: newStatus } : p)
      );
    } catch (error: any) {
      showError(error.message || "Erro ao atualizar status.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pago": return <Badge className="bg-green-500 text-primary-foreground">EM DIA</Badge>;
      case "pendente": return <Badge className="bg-yellow-500 text-primary-foreground">PENDENTE</Badge>;
      case "atrasado": return <Badge variant="destructive">CALOTEIRO</Badge>;
      case "diarista": return <Badge className="bg-blue-500 text-primary-foreground">DIARISTA</Badge>;
      default: return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const filteredPlayers = players.filter(player =>
    player.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Controle de Mensalidades</CardTitle>
              <CardDescription>Visualize e atualize o status de pagamento de cada jogador. Os status são verificados automaticamente ao entrar nesta página.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsPixConfigOpen(true)}>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Configurar PIX
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="due-date" className="text-sm font-medium">Vencimento (dia):</label>
                <Input id="due-date" type="number" className="w-20" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min="1" max="28" />
                <Button size="sm" onClick={() => handleSettingSave('payment_due_day', dueDate, setDbDueDate)} disabled={dueDate === dbDueDate}><SaveIcon className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="monthly-fee" className="text-sm font-medium">Mensalidade (R$):</label>
                <Input id="monthly-fee" type="number" className="w-24" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} min="0" />
                <Button size="sm" onClick={() => handleSettingSave('monthly_fee_amount', monthlyFee, setDbMonthlyFee)} disabled={monthlyFee === dbMonthlyFee}><SaveIcon className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="daily-fee" className="text-sm font-medium">Diária (R$):</label>
                <Input id="daily-fee" type="number" className="w-24" value={dailyFee} onChange={(e) => setDailyFee(e.target.value)} min="0" />
                <Button size="sm" onClick={() => handleSettingSave('daily_fee_amount', dailyFee, setDbDailyFee)} disabled={dailyFee === dbDailyFee}><SaveIcon className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Buscar jogador..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Status Atual</TableHead>
                <TableHead className="text-right">Alterar Status (Manual)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                      Carregando e verificando status...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.full_name}</TableCell>
                    <TableCell>{getStatusBadge(player.payment_status || (player.is_mensalista ? 'atrasado' : 'diarista'))}</TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={player.payment_status}
                        onValueChange={(value: Profile['payment_status']) => handleStatusChange(player.id, value)}
                        disabled={!player.is_mensalista}
                      >
                        <SelectTrigger className="w-[120px] ml-auto">
                          <SelectValue placeholder="Alterar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pago">EM DIA</SelectItem>
                          <SelectItem value="pendente">PENDENTE</SelectItem>
                          <SelectItem value="atrasado">CALOTEIRO</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Nenhum jogador encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PixConfigDialog 
        isOpen={isPixConfigOpen}
        onOpenChange={setIsPixConfigOpen}
        onSuccess={() => {}}
      />
    </>
  );
};

export default PlayerPaymentStatus;