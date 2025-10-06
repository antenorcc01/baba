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
import { imageToBase64 } from "@/utils/imageToBase64";

interface Payment {
  id: number;
  payment_date: string;
  description: string;
  category: string;
  type: 'Entrada' | 'Saída';
  amount: number;
  profiles: { full_name: string } | null;
}

const CashFlowReport = () => {
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*, profiles(full_name)')
          .order('payment_date', { ascending: false });
        if (error) throw error;
        setAllPayments(data || []);
      } catch (error: any) {
        showError(error.message || "Erro ao carregar pagamentos.");
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      showError("Por favor, selecione uma data de início e fim.");
      return;
    }
    const filtered = allPayments.filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    setFilteredPayments(filtered);
  };

  useEffect(() => {
    if (allPayments.length > 0) {
      handleFilter();
    }
  }, [allPayments]);

  const totalRevenue = filteredPayments.filter(p => p.type === 'Entrada').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = filteredPayments.filter(p => p.type === 'Saída').reduce((sum, p) => sum + p.amount, 0);
  const balance = totalRevenue - totalExpenses;

  const handleExportPdf = async () => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await imageToBase64('/favicon.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 20, 20);
    } catch (error) {
      console.error("Error loading logo for PDF:", error);
    }

    doc.setFontSize(16);
    doc.text("Relatório de Fluxo de Caixa", 40, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${format(startDate!, 'dd/MM/yyyy')} a ${format(endDate!, 'dd/MM/yyyy')}`, 40, 24);

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)']],
      body: filteredPayments.map(p => [
        format(new Date(p.payment_date), 'dd/MM/yyyy'),
        p.description,
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

    doc.save(`relatorio_caixa_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Fluxo de Caixa</CardTitle>
        <CardDescription>Analise as entradas e saídas do caixa por período.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <Button onClick={handleFilter} className="w-full sm:w-auto"><FilterIcon className="h-4 w-4 mr-2" />Aplicar Filtro</Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto"><FileDownIcon className="h-4 w-4 mr-2" />Exportar PDF</Button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-green-100 rounded-lg"><h4 className="font-bold text-green-800">Entradas</h4><p className="text-lg font-semibold text-green-800">R$ {totalRevenue.toFixed(2)}</p></div>
          <div className="p-4 bg-red-100 rounded-lg"><h4 className="font-bold text-red-800">Saídas</h4><p className="text-lg font-semibold text-red-800">R$ {totalExpenses.toFixed(2)}</p></div>
          <div className="p-4 bg-blue-100 rounded-lg"><h4 className="font-bold text-blue-800">Saldo</h4><p className={`text-lg font-semibold ${balance >= 0 ? 'text-blue-800' : 'text-red-800'}`}>R$ {balance.toFixed(2)}</p></div>
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow> :
            filteredPayments.map(p => (
              <TableRow key={p.id}>
                <TableCell>{format(new Date(p.payment_date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{p.description}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell className={`text-right font-medium ${p.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>R$ {p.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CashFlowReport;