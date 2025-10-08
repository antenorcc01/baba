"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Calendar, MapPin, Users, ArrowRight, Bell, UserPlus, DollarSign, UserX, TrophyIcon, StarIcon, GoalIcon } from "lucide-react"; // Importar StarIcon e GoalIcon
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface NextGame {
  id: number;
  game_date: string;
  arenas: { name: string } | null;
  games_players: { count: number }[];
  games_guest_players: { count: number }[];
  max_players: number;
}

interface NewPlayer {
  full_name: string;
  created_at: string;
  profile_picture_url: string | null;
}

interface SuspendedAthlete {
  id: string | number;
  full_name: string;
  suspension_reason: string | null;
  suspension_end_date: string | null;
  type: 'player' | 'guest';
}

interface Payment {
  amount: number;
  type: 'Entrada' | 'Saída';
  payment_date: string;
}

interface ChampionInfo {
  tournamentName: string;
  teamName: string;
  players: {
    name: string;
    avatarUrl: string | null;
  }[];
}

const COLORS = ['#0088FE', '#00C49F']; // Colors for the player/guest chart

const Dashboard = () => {
  const { profile, isSuspended, gameTermSingular } = useAuth();
  const [nextGame, setNextGame] = useState<NextGame | null>(null);
  const [newPlayers, setNewPlayers] = useState<NewPlayer[]>([]);
  const [lastRuleUpdate, setLastRuleUpdate] = useState<string | null>(null);
  const [paymentDueDate, setPaymentDueDate] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [suspendedAthletes, setSuspendedAthletes] = useState<SuspendedAthlete[]>([]);
  const [monthlyFinancials, setMonthlyFinancials] = useState({ revenue: 0, expenses: 0, balance: 0 });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [championInfo, setChampionInfo] = useState<ChampionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.split(" ");
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const renderSkillStars = (level: number | undefined) => {
    const stars = [];
    for (let i = 1; i <= 3; i++) {
      stars.push(
        <StarIcon 
          key={i} 
          className={`h-4 w-4 ${i <= (level || 1) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch next game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, game_date, max_players, arenas(name), games_players(count), games_guest_players(count)')
        .eq('status', 'Agendado')
        .gte('game_date', new Date().toISOString())
        .order('game_date', { ascending: true })
        .limit(1)
        .single();
      if (gameError && gameError.code !== 'PGRST116') throw gameError;
      setNextGame(gameData as NextGame | null);

      // Fetch new players
      const { data: playersData, error: playersError } = await supabase
        .from('profiles')
        .select('full_name, created_at, profile_picture_url')
        .order('created_at', { ascending: false })
        .limit(5);
      if (playersError) throw playersError;
      setNewPlayers(playersData);

      // Fetch last rule update
      const { data: ruleData, error: ruleError } = await supabase
        .from('group_rules')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (ruleError && ruleError.code !== 'PGRST116') throw ruleError;
      if (ruleData) setLastRuleUpdate(ruleData.updated_at);

      // Fetch payment due date for mensalistas
      if (profile?.is_mensalista) {
        const { data: settingData, error: settingError } = await supabase
          .from('group_settings')
          .select('setting_value')
          .eq('setting_key', 'payment_due_day')
          .single();
        if (settingError && settingError.code !== 'PGRST116') throw settingError;
        if (settingData) setPaymentDueDate(settingData.setting_value);
      }

      // Fetch player and guest counts for chart
      const { count: profilesCount, error: profilesCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false);
      if (profilesCountError) throw profilesCountError;
      setPlayerCount(profilesCount);

      const { count: guestsCount, error: guestsCountError } = await supabase
        .from('guest_players')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('is_suspended', false);
      if (guestsCountError) throw guestsCountError;
      setGuestCount(guestsCount);

      // Fetch suspended athletes
      const { data: suspendedProfiles, error: suspendedProfilesError } = await supabase
        .from('profiles')
        .select('id, full_name, suspension_reason, suspension_end_date')
        .eq('is_suspended', true)
        .eq('is_deleted', false);
      if (suspendedProfilesError) throw suspendedProfilesError;

      const { data: suspendedGuests, error: suspendedGuestsError } = await supabase
        .from('guest_players')
        .select('id, full_name, suspension_reason, suspension_end_date')
        .eq('is_suspended', true)
        .eq('is_deleted', false);
      if (suspendedGuestsError) throw suspendedGuestsError;

      const combinedSuspended: SuspendedAthlete[] = [
        ...(suspendedProfiles || []).map(p => ({ ...p, type: 'player' as const })),
        ...(suspendedGuests || []).map(g => ({ ...g, type: 'guest' as const })),
      ].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      setSuspendedAthletes(combinedSuspended);

      // Fetch all payments for financial summary
      const { data: paymentsRes, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, type, payment_date');
      if (paymentsError) throw paymentsError;
      const allPayments: Payment[] = paymentsRes || [];

      // Calculate monthly financials based on selectedMonth/Year
      const filteredMonthlyPayments = allPayments.filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth().toString() === selectedMonth && paymentDate.getFullYear().toString() === selectedYear;
      });

      const monthlyRevenue = filteredMonthlyPayments.filter(p => p.type === 'Entrada').reduce((sum, p) => sum + p.amount, 0);
      const monthlyExpenses = filteredMonthlyPayments.filter(p => p.type === 'Saída').reduce((sum, p) => sum + p.amount, 0);
      setMonthlyFinancials({
        revenue: monthlyRevenue,
        expenses: monthlyExpenses,
        balance: monthlyRevenue - monthlyExpenses,
      });

      // Fetch latest champion team
      const { data: latestTournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('name, champion_team_id')
        .not('champion_team_id', 'is', null)
        .eq('status', 'finished')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (tournamentError && tournamentError.code !== 'PGRST116') throw tournamentError;

      if (latestTournament && latestTournament.champion_team_id) {
        const { data: championTeam, error: teamError } = await supabase
          .from('tournament_teams')
          .select(`
            name,
            tournament_team_players(
              profiles(full_name, profile_picture_url),
              guest_players(full_name)
            )
          `)
          .eq('id', latestTournament.champion_team_id)
          .single();
        
        if (teamError) throw teamError;

        if (championTeam) {
          const players = championTeam.tournament_team_players.map((p: any) => ({
            name: p.profiles?.full_name || p.guest_players?.full_name,
            avatarUrl: p.profiles?.profile_picture_url || null,
          }));
          setChampionInfo({
            tournamentName: latestTournament.name,
            teamName: championTeam.name,
            players,
          });
        }
      } else {
        setChampionInfo(null);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedMonth, selectedYear]);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [profile, fetchDashboardData]);

  const getPaymentStatusInfo = () => {
    if (!profile || !profile.is_mensalista) return null;

    switch (profile.payment_status) {
      case 'pago':
        return {
          variant: "success",
          title: "Mensalidade em Dia!",
          description: "Obrigado por manter seu pagamento atualizado. Bom jogo!",
        };
      case 'pendente':
        return {
          variant: "default",
          title: "Pagamento Pendente",
          description: `Sua mensalidade vence no dia ${paymentDueDate || '10'}. Não se esqueça de pagar para garantir sua vaga.`,
        };
      case 'atrasado':
        return {
          variant: "destructive",
          title: "Pagamento Atrasado!",
          description: `Sua mensalidade está atrasada. Regularize sua situação para poder participar dos ${gameTermSingular.toLowerCase()}s.`,
        };
      default:
        return null;
    }
  };

  const paymentStatusInfo = getPaymentStatusInfo();

  const chartData = [
    { name: 'Jogadores', value: playerCount || 0 },
    { name: 'Convidados', value: guestCount || 0 },
  ];

  const totalMembers = (playerCount || 0) + (guestCount || 0);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value === 0) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Bem-vindo, {profile?.full_name?.split(' ')[0]}!</h1>
      <p className="text-muted-foreground mb-6">Aqui está um resumo das atividades do grupo.</p>

      <div className="space-y-6">
        {isSuspended && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Você está Suspenso!</AlertTitle>
            <AlertDescription>
              Você não poderá participar dos jogos até que sua suspensão termine. Motivo: {profile.suspension_reason || 'Não especificado'}.
              {profile.suspension_end_date && ` Fim da suspensão: ${format(parseISO(profile.suspension_end_date), 'dd/MM/yyyy')}`}
            </AlertDescription>
          </Alert>
        )}

        {paymentStatusInfo && (
          <Alert variant={paymentStatusInfo.variant as any}>
            <DollarSign className="h-4 w-4" />
            <AlertTitle>{paymentStatusInfo.title}</AlertTitle>
            <AlertDescription>
              {paymentStatusInfo.description}
              <Button asChild variant="link" className="p-0 h-auto ml-2">
                <Link to="/meus-pagamentos">Ver pagamentos</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> Atletas Suspensos</CardTitle>
            <CardDescription>Jogadores e convidados atualmente suspensos.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto">
            {suspendedAthletes.length > 0 ? (
              <div className="space-y-3">
                {suspendedAthletes.map(athlete => (
                  <div key={`${athlete.type}-${athlete.id}`} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="font-medium">{athlete.full_name} <Badge variant="secondary" className="ml-1">{athlete.type === 'player' ? 'Jogador' : 'Convidado'}</Badge></p>
                      <p className="text-sm text-muted-foreground">{athlete.suspension_reason}</p>
                    </div>
                    {athlete.suspension_end_date && (
                      <p className="text-sm text-muted-foreground flex-shrink-0">Até: {format(parseISO(athlete.suspension_end_date), 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <UserX className="mx-auto h-8 w-8 mb-2" />
                <p>Nenhum atleta suspenso no momento.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {championInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrophyIcon className="text-yellow-500" /> Últimos Campeões</CardTitle>
              <CardDescription>
                Time campeão do torneio: <strong>{championInfo.tournamentName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-bold text-center mb-4">{championInfo.teamName}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {championInfo.players.map(player => (
                  <div key={player.name} className="flex flex-col items-center text-center">
                    <Avatar>
                      <AvatarImage src={player.avatarUrl || ''} />
                      <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium mt-2">{player.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="text-primary" /> Resumo Financeiro</CardTitle>
            <CardDescription>Visão geral das finanças do grupo.</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-3">Resumo do Mês ({format(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 'MMMM/yyyy', { locale: ptBR }).charAt(0).toUpperCase() + format(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 'MMMM/yyyy', { locale: ptBR }).slice(1)})</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="month-select">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month-select">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {format(new Date(0, i), 'MMMM', { locale: ptBR }).charAt(0).toUpperCase() + format(new Date(0, i), 'MMMM', { locale: ptBR }).slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="year-select">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year-select">
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-100 rounded-lg">
                <h4 className="font-bold text-green-800">Receitas</h4>
                <p className="text-lg font-semibold text-green-800">R$ {monthlyFinancials.revenue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-red-100 rounded-lg">
                <h4 className="font-bold text-red-800">Despesas</h4>
                <p className="text-lg font-semibold text-red-800">R$ {monthlyFinancials.expenses.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-lg">
                <h4 className="font-bold text-blue-800">Saldo</h4>
                <p className={`text-lg font-semibold ${monthlyFinancials.balance >= 0 ? 'text-blue-800' : 'text-red-800'}`}>R$ {monthlyFinancials.balance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="text-primary" /> Próximo {gameTermSingular}</CardTitle>
            </CardHeader>
            <CardContent>
              {nextGame ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data e Hora</p>
                    <p className="font-semibold capitalize">{format(parseISO(nextGame.game_date), "eeee, dd 'de' MMMM 'às' HH:mm'h'", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="font-semibold flex items-center gap-1"><MapPin className="h-4 w-4" /> {nextGame.arenas?.name || 'A definir'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmados</p>
                    <p className="font-semibold flex items-center gap-1"><Users className="h-4 w-4" /> {(nextGame.games_players[0]?.count || 0) + (nextGame.games_guest_players[0]?.count || 0)} / {nextGame.max_players}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum {gameTermSingular.toLowerCase()} agendado no momento.</p>
              )}
            </CardContent>
            {nextGame && (
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={`/baba/${nextGame.id}`}>
                    Ver <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="text-primary" /> Membros da Comunidade</CardTitle>
              <CardDescription>Total de {totalMembers} membros ativos.</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              {playerCount !== null && guestCount !== null && (playerCount > 0 || guestCount > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={renderCustomizedLabel}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} ${name}`, '']}/>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum membro ativo para exibir.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="text-primary" /> Novos Jogadores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {newPlayers.length > 0 ? newPlayers.map(player => (
                  <div key={player.full_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.profile_picture_url || ''} />
                        <AvatarFallback>{getInitials(player.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{player.full_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(player.created_at), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhum jogador novo recentemente.</p>}
              </CardContent>
            </Card>

            {lastRuleUpdate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bell className="text-primary" /> Atualizações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Regulamento</p>
                      <p className="text-sm text-muted-foreground">
                        Última atualização {formatDistanceToNow(parseISO(lastRuleUpdate), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/regulamento">Ver Regras</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;