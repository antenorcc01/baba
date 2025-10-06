"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, UsersIcon, DollarSignIcon, MapPinIcon, ArrowRightIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Stats {
  nextGame: any;
  activePlayers: number | null;
  totalArenas: number | null;
  financialBalance: number;
  playerStatusCounts: { [key: string]: number };
}

interface RecentPayment {
  id: number;
  description: string;
  amount: number;
  type: 'Entrada' | 'Saída';
  profiles: { full_name: string } | null;
  created_at: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !user || !isAdmin) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const [
          nextGameRes,
          arenasCountRes,
          paymentsRes,
          profilesRes,
          recentPaymentsRes
        ] = await Promise.all([
          supabase.from('games').select('*, arenas(name)').eq('status', 'Agendado').order('game_date', { ascending: true }).limit(1).single(),
          supabase.from('arenas').select('id', { count: 'exact', head: true }),
          supabase.from('payments').select('amount, type, payment_date'),
          supabase.from('profiles').select('id, payment_status'),
          supabase.from('payments').select('id, description, amount, type, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(5)
        ]);

        const payments = paymentsRes.data || [];
        const financialBalance = payments.reduce((acc, p) => p.type === 'Entrada' ? acc + p.amount : acc - p.amount, 0);

        const profiles = profilesRes.data || [];
        const playerStatusCounts = profiles.reduce((acc, profile) => {
          const status = profile.payment_status || 'indefinido';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        setStats({
          nextGame: nextGameRes.data,
          activePlayers: profiles.length,
          totalArenas: arenasCountRes.count,
          financialBalance,
          playerStatusCounts,
        });

        const monthlyData: { [key: string]: { revenue: number, expenses: number } } = {};
        payments.forEach(p => {
          const month = format(new Date(p.payment_date), 'MMM', { locale: ptBR });
          if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, expenses: 0 };
          }
          if (p.type === 'Entrada') {
            monthlyData[month].revenue += p.amount;
          } else {
            monthlyData[month].expenses += p.amount;
          }
        });

        const formattedChartData = Object.keys(monthlyData).map(month => ({
          name: month.charAt(0).toUpperCase() + month.slice(1),
          Receitas: monthlyData[month].revenue,
          Despesas: monthlyData[month].expenses,
        })).reverse();
        
        setChartData(formattedChartData);
        setRecentPayments(recentPaymentsRes.data || []);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isAdmin, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pago": return <Badge className="bg-green-500 text-primary-foreground">EM DIA</Badge>;
      case "pendente": return <Badge className="bg-yellow-500 text-primary-foreground">PENDENTE</Badge>;
      case "atrasado": return <Badge variant="destructive">CALOTEIRO</Badge>;
      case "diarista": return <Badge className="bg-blue-500 text-primary-foreground">DIARISTA</Badge>;
      default: return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Jogo</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.nextGame ? (
              <>
                <div className="text-2xl font-bold">
                  {format(new Date(stats.nextGame.game_date), "dd/MM/yyyy")}
                </div>
                <p className="text-xs text-muted-foreground">
                  às {format(new Date(stats.nextGame.game_date), "HH:mm")} em {stats.nextGame.arenas.name}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum jogo agendado</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jogadores Ativos</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePlayers}</div>
            <p className="text-xs text-muted-foreground">Jogadores cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Financeiro</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats && stats.financialBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              R$ {stats?.financialBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Balanço atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arenas</CardTitle>
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalArenas}</div>
            <p className="text-xs text-muted-foreground">Arenas cadastradas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral Financeira</CardTitle>
            <CardDescription>Receitas vs. Despesas nos últimos meses.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Status dos Jogadores</CardTitle>
            <CardDescription>Resumo do status de pagamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.playerStatusCounts && Object.entries(stats.playerStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(status)}
                    <span className="font-medium capitalize">{status === 'atrasado' ? 'Caloteiro' : status}</span>
                  </div>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link to="/jogadores">
                Gerenciar Jogadores <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>Últimos 5 lançamentos financeiros.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Jogador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.description}</TableCell>
                    <TableCell>{payment.profiles?.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={payment.type === 'Entrada' ? 'default' : 'destructive'}>
                        {payment.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${payment.type === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>
                      R$ {payment.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma transação recente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;