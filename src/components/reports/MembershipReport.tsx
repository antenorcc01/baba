"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDownIcon, FilterIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, getYear, getMonth, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { showError } from "@/utils/toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { imageToBase64 } from "@/utils/imageToBase64";

interface Mensalista {
  id: string;
  full_name: string;
  status: 'Pago' | 'Pendente';
}

const MembershipReport = () => {
  const [reportData, setReportData] = useState<Mensalista[]>([]);
  const [year, setYear] = useState(getYear(new Date()).toString());
  const [month, setMonth] = useState(getMonth(new Date()).toString());
  const [statusFilter, setStatusFilter] = useState('todos');
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(parseInt(year), parseInt(month));
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      const { data: mensalistas, error: mensalistasError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_mensalista', true);
      if (mensalistasError) throw mensalistasError;

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('player_id')
        .eq('category', 'Mensalidade')
        .gte('payment_date', monthStart.toISOString())
        .lte('payment_date', monthEnd.toISOString());
      if (paymentsError) throw paymentsError;

      const paidPlayerIds = new Set(payments.map(p => p.player_id));

      const data = mensalistas.map(m => ({
        ...m,
        status: paidPlayerIds.has(m.id) ? 'Pago' : 'Pendente'
      } as Mensalista));
      
      setReportData(data);
    } catch (error: any) {
      showError(error.message || "Erro ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, []);

  const handleExportPdf = async () => {
    const doc = new jsPDF();
    const monthName = format(new Date(parseInt(year), parseInt(month)), 'LLLL', { locale: ptBR });
    
    try {
      const logoBase64 = await imageToBase64('/favicon.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 20, 20);
    } catch (error) {
      console.error("Error loading logo for PDF:", error);
    }

    doc.setFontSize(16);
    doc.text(`Relatório de Mensalidades`, 40, 18);
    doc.setFontSize(12);
    doc.text(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`, 40, 24);
    
    autoTable(doc, {
      startY: 35,
      head: [['Jogador', 'Status']],
      body: filteredData.map(p => [p.full_name, p.status]),
      theme: 'striped',
      headStyles: { fillColor: [0, 119, 182] },
    });

    doc.save(`relatorio_mensalidades_${year}_${String(parseInt(month) + 1).padStart(2, '0')}.pdf`);
  };

  const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(0, i), 'LLLL', { locale: ptBR }),
  }));

  const filteredData = reportData.filter(p => {
    if (statusFilter === 'todos') return true;
    return p.status.toLowerCase() === statusFilter;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Mensalidades</CardTitle>
        <CardDescription>Acompanhe o status de pagamento dos mensalistas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 border rounded-lg">
          <div className="flex-1"><label className="text-sm font-medium mb-1 block">Ano</label><Select value={year} onValueChange={setYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex-1"><label className="text-sm font-medium mb-1 block">Mês</label><Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex-1"><label className="text-sm font-medium mb-1 block">Status</label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectContent></Select></div>
          <div className="flex items-end gap-2">
            <Button onClick={generateReport} className="w-full sm:w-auto"><FilterIcon className="h-4 w-4 mr-2" />Gerar Relatório</Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto"><FileDownIcon className="h-4 w-4 mr-2" />Exportar PDF</Button>
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Jogador</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={2} className="text-center">Gerando relatório...</TableCell></TableRow> :
            filteredData.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.full_name}</TableCell>
                <TableCell className="text-right"><Badge variant={p.status === 'Pago' ? 'default' : 'destructive'}>{p.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MembershipReport;