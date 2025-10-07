"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, PlusIcon, CreditCardIcon, TrendingUpIcon, TrendingDownIcon, EditIcon, TrashIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import PaymentForm, { PaymentFormData, Payment } from "@/components/payments/PaymentForm";
import PlayerPaymentStatus from "@/components/payments/PlayerPaymentStatus";
import CashFlowReport from "@/components/reports/CashFlowReport";
import MembershipReport from "@/components/reports/MembershipReport";
import { updateUserPaymentStatus } from "@/utils/finance";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Importar ScrollArea e ScrollBar

interface PaymentWithProfile extends Payment {
  profiles?: {
    full_name: string;
  } | null;
  guest_players?: {
    full_name: string;
  } | null;
}

export default function FinanceiroTab() {
  const [payments, setPayments] = useState<PaymentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdmin, loading: authLoading, profile } = useAuth();

  const fetchPayments = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('payments')
        .select(`*, profiles (full_name), guest_players (full_name)`)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchPayments();
    }
  }, [isAdmin, authLoading]);

  const handleFormSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      const dateParts = data.paymentDate.split('-').map(part => parseInt(part, 10));
      const year = dateParts[0];
      const month = dateParts[1] - 1;
      const day = dateParts[2];
      const correctedDate = new Date(Date.UTC(year, month, day));

      const paymentData: any = {
        type: data.type,
        category: data.category,
        description: data.description,
        amount: parseFloat(data.amount),
        payment_date: correctedDate.toISOString(),
        player_id: null,
        guest_player_id: null,
        baba_id: profile?.baba_id,
      };

      if (data.type === 'Entrada' && data.playerId) {
        const separatorIndex = data.playerId.indexOf('-');
        if (separatorIndex > -1) {
          const type = data.playerId.substring(0, separatorIndex);
          const id = data.playerId.substring(separatorIndex + 1);
          
          if (type === 'profile') {
            paymentData.player_id = id;
          } else if (type === 'guest') {
            paymentData.guest_player_id = parseInt(id, 10);
          }
        }
      }

      if (editingPayment) {
        const { error } = await supabase.from('payments').update(paymentData).eq('id', editingPayment.id);
        if (error) throw error;
        showSuccess("Pagamento atualizado com sucesso!");
      } else {
        const { error } = await supabase.from('payments').insert(paymentData);
        if (error) throw error;
        showSuccess("Pagamento registrado com sucesso!");
      }

      if (paymentData.category === 'Mensalidade' && paymentData.player_id) {
        await updateUserPaymentStatus(paymentData.player_id);
      }

      closeDialog();
      fetchPayments();
    } catch (error: any) {
      showError(error.message || "Erro ao salvar pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
      try {
        const paymentToDelete = payments.find(p => p.id === paymentId);

        const { error } = await supabase.from('payments').delete().eq('id', paymentId);
        if (error) throw error;
        
        showSuccess("Lançamento excluído com sucesso!");

        if (paymentToDelete && paymentToDelete.category === 'Mensalidade' && paymentToDelete.player_id) {
          await updateUserPaymentStatus(paymentToDelete.player_id);
        }

        fetchPayments();
      } catch (error: any) {
        showError(error.message || "Erro ao excluir lançamento.");
      }
    }
  };

  const openAddDialog = () => {
    setEditingPayment(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
  };

  const totalRevenue = payments.filter(p => p.type === 'Entrada').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = payments.filter(p => p.type === 'Saída').reduce((sum, p) => sum + p.amount, 0);
  const balance = totalRevenue - totalExpenses;

  const filteredPayments = payments.filter(p => 
    (p.profiles?.full_name || p.guest_players?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="flex-grow flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Receitas</CardTitle><TrendingUpIcon className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div><p className="text-xs text-muted-foreground">Total de entradas</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Despesas</CardTitle><TrendingDownIcon className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalExpenses.toFixed(2)}</div><p className="text-xs text-muted-foreground">Total de saídas</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Saldo</CardTitle><CreditCardIcon className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {balance.toFixed(2)}</div><p className="text-xs text-muted-foreground">Saldo atual</p></CardContent></Card>
      </div>
      
      <Tabs defaultValue="transactions">
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <TabsList className="flex w-max"> {/* Removido grid grid-cols-3 */}
            <TabsTrigger value="transactions">Histórico de Transações</TabsTrigger>
            <TabsTrigger value="monthly_control">Controle de Mensalidades</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative w-full md:w-64"><SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><Input placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <Button onClick={openAddDialog}><PlusIcon className="h-4 w-4 mr-2" />Novo Lançamento</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Jogador</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.payment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                      <TableCell className="font-medium">{p.description}</TableCell>
                      <TableCell>{p.profiles?.full_name || p.guest_players?.full_name || 'N/A'}</TableCell>
                      <TableCell><Badge variant={p.type === "Entrada" ? "default" : "destructive"}>{p.category}</Badge></TableCell>
                      <TableCell className={`text-right font-bold ${p.type === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>R$ {p.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(p)}><EditIcon className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeletePayment(p.id)}><TrashIcon className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="monthly_control" className="mt-4">
          <PlayerPaymentStatus />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <div className="space-y-6">
            <CashFlowReport />
            <MembershipReport />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editar Lançamento" : "Novo Lançamento Financeiro"}</DialogTitle>
            <DialogDescription>Preencha os detalhes da transação.</DialogDescription>
          </DialogHeader>
          <PaymentForm payment={editingPayment ?? undefined} onSubmit={handleFormSubmit} onCancel={closeDialog} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
}