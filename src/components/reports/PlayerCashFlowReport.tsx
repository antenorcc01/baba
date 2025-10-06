"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { FileDownIcon, FilterIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { showError } from "@/utils/toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: number;
  payment_date: string;
  description: string;
  category: string;
  type: 'Entrada' | 'Saída';
  amount: number;
  profiles: { full_name: string } | null;
  guest_players: { full_name: string } | null;
}

// Helper function to get the first name
const getFirstName = (fullName: string | null | undefined) => {
  if (!fullName) return 'N/A';
  return fullName.split(' ')[0];
};

const PlayerCashFlowReport = () => {
  const { loading: authLoading } = useAuth();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (authLoading) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*, profiles(full_name), guest_players(full_name)')
          .order('payment_date', { ascending: false });
        if (error) throw error;
        setAllPayments(data || []);
      } catch (error: any) {
        showError(error.message || "Erro ao carregar os pagamentos.");
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [authLoading]);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      showError("Por favor, selecione uma data de início e fim.");
      return;
    }
    const filtered = allPayments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      return paymentDate >= startDate && paymentDate <= adjustedEndDate;
    });
    setFilteredPayments(filtered);
  };

  useEffect(() => {
    if (allPayments.length > 0) {
      handleFilter();
    }
  }, [allPayments, startDate, endDate]);

  const totalRevenue = filteredPayments.filter(p => p.type === 'Entrada').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = filteredPayments.filter(p => p.type === 'Saída').reduce((sum, p) => sum + p.amount, 0);
  const balance = totalRevenue - totalExpenses;

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Fluxo de Caixa Geral", 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${format(startDate!, 'dd/MM/yyyy')} a ${format(endDate!, 'dd/MM/yyyy')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Descrição', 'Pagador/Beneficiário', 'Categoria', 'Tipo', 'Valor (R$)']],
      body: filteredPayments.map(p => [
        format(new Date(p.payment_date), 'dd/MM/yyyy'),
        p.description,
        p.profiles?.full_name || p.guest_players?.full_name || 'N/A',
        p.category,
        p.type,
        p.amount.toFixed(2)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 119, 182] },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`Total de Entradas: R$ ${totalRevenue.toFixed(2)}`, 14, finalY + 10);
    doc.text(`Total de Saídas: R$ ${totalExpenses.toFixed(2)}`, 14, finalY + 16);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo do Período: R$ ${balance.toFixed(2)}`, 14, finalY + 22);

    doc.save(`relatorio_caixa_geral_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Geral</CardTitle>
        <CardDescription>Acompanhe todas as entradas e saídas financeiras do grupo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-4/5 mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 border rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Data de Início</label>
              <DatePicker date={startDate} setDate={setStartDate} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Data de Fim</label>
              <DatePicker date={endDate} setDate={setEndDate} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter} className="w-full sm:w-auto"><FilterIcon className="h-4 w-4 mr-2" />Filtrar</Button>
              <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto"><FileDownIcon className="h-4 w-4 mr-2" />Baixar</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-green-100 rounded-lg"><h4 className="font-bold text-green-800">Entradas</h4><p className="text-lg font-semibold text-green-800">R$ {totalRevenue.toFixed(2)}</p></div>
            <div className="p-4 bg-red-100 rounded-lg"><h4 className="font-bold text-red-800">Saídas</h4><p className="text-lg font-semibold text-red-800">R$ {totalExpenses.toFixed(2)}</p></div>
            <div className="p-4 bg-blue-100 rounded-lg"><h4 className="font-bold text-blue-800">Saldo</h4><p className={`text-lg font-semibold ${balance >= 0 ? 'text-blue-800' : 'text-red-800'}`}>R$ {balance.toFixed(2)}</p></div>
          </div>

          {/* Tabela para telas maiores */}
          <div className="hidden md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Pagador</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(p.payment_date), 'dd/MM')}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell className="whitespace-nowrap">{getFirstName(p.profiles?.full_name || p.guest_players?.full_name)}</TableCell>
                      <TableCell><Badge variant={p.type === 'Entrada' ? 'default' : 'destructive'}>{p.type}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${p.type === 'Entrada' ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>R$ {p.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center">Nenhum pagamento encontrado para o período.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Cards empilhados para telas menores */}
          <div className="md:hidden space-y-4">
            {filteredPayments.length > 0 ? (
              filteredPayments.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{format(new Date(p.payment_date), 'dd/MM/yyyy')}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[180px]">{p.description}</div>
                    </div>
                    <Badge variant={p.type === 'Entrada' ? 'default' : 'destructive'}>
                      {p.type === 'Entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-muted-foreground">
                      {getFirstName(p.profiles?.full_name || p.guest_players?.full_name)}
                    </div>
                    <div className={`font-bold ${p.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {p.amount.toFixed(2)}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum pagamento encontrado para o período.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerCashFlowReport;