"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, DollarSign } from "lucide-react";
import PaymentModal from "@/components/payments/PaymentModal";
import { showError } from "@/utils/toast";
import { Session } from "@supabase/supabase-js";
import PlayerCashFlowReport from "@/components/reports/PlayerCashFlowReport";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area"; // Importar ScrollArea

interface ModalDetails {
  amount: number;
  paymentType: 'Mensalidade' | 'Diária';
}

const MeusPagamentos = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmounts, setPaymentAmounts] = useState({ monthly: 0, daily: 0 });
  const [dueDateDay, setDueDateDay] = useState<string | null>(null); // New state for due date
  const [modalDetails, setModalDetails] = useState<ModalDetails | null>(null);
  const [isCashFlowReportOpen, setIsCashFlowReportOpen] = useState(false); // New state for cash flow dialog

  const fetchData = useCallback(async (currentSession: Session) => {
    setLoading(true);
    try {
      const user = currentSession.user;
      if (!user) throw new Error("Usuário não encontrado.");

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_mensalista, payment_status')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: settingsData, error: settingsError } = await supabase
        .from('group_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['monthly_fee_amount', 'daily_fee_amount', 'payment_due_day']); // Fetch due date
      if (settingsError) throw settingsError;

      const amounts = settingsData.reduce((acc, setting) => {
        if (setting.setting_key === 'monthly_fee_amount') {
          acc.monthly = parseFloat(setting.setting_value) || 0;
        } else if (setting.setting_key === 'daily_fee_amount') {
          acc.daily = parseFloat(setting.setting_value) || 0;
        } else if (setting.setting_key === 'payment_due_day') {
          setDueDateDay(setting.setting_value); // Set due date
        }
        return acc;
      }, { monthly: 0, daily: 0 });
      setPaymentAmounts(amounts);

    } catch (error: any) {
      showError(error.message || "Erro ao carregar dados de pagamento.");
    } finally {
      setLoading(false);
    }
  }, []); // Dependência vazia, pois todas as dependências internas são estáveis

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          fetchData(session);
        } else {
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchData]); // Agora fetchData é uma dependência estável

  const handlePaymentClick = (type: 'Mensalidade' | 'Diária') => {
    const amount = type === 'Mensalidade' ? paymentAmounts.monthly : paymentAmounts.daily;
    setModalDetails({
      amount,
      paymentType: type,
    });
  };

  const renderPaymentStatus = () => {
    if (!profile || !profile.is_mensalista) return null;

    const isMensalistaPago = profile.payment_status === 'pago';
    const isMensalistaPendente = profile.payment_status === 'pendente';
    const statusIcon = isMensalistaPago ? <CheckCircle className="h-4 w-4 text-green-500" /> : (isMensalistaPendente ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-red-500" />);
    const statusText = isMensalistaPago ? 'Em dia' : (isMensalistaPendente ? 'Pendente' : 'Atrasado');
    const statusColor = isMensalistaPago ? 'text-green-600' : (isMensalistaPendente ? 'text-yellow-600' : 'text-red-600');

    return (
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className={`font-medium ${statusColor}`}>{statusText}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>Você precisa estar logado para ver seus pagamentos.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isMensalista = profile?.is_mensalista;
  const isMensalistaPago = profile?.payment_status === 'pago';

  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Meus Pagamentos</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{isMensalista ? 'Situação da Mensalidade' : 'Pagamento de Diária'}</CardTitle>
              <CardDescription>
                {isMensalista
                  ? 'Verifique o status da sua mensalidade e realize o pagamento.'
                  : 'Realize o pagamento da sua diária para participar dos jogos.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMensalista && (
                <>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                    <span>Status atual:</span>
                    {renderPaymentStatus()}
                  </div>
                  {dueDateDay && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                      <span>Vencimento:</span>
                      <span className="font-medium">Dia {dueDateDay} de cada mês</span>
                    </div>
                  )}
                </>
              )}
              <Button
                onClick={() => handlePaymentClick(isMensalista ? 'Mensalidade' : 'Diária')}
                disabled={isMensalista && isMensalistaPago}
                className="w-full"
              >
                {isMensalista ? 'Pagar Mensalidade' : 'Pagar Diária'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCashFlowReportOpen(true)}
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Fluxo de Caixa
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentModal
        isOpen={!!modalDetails}
        onOpenChange={(isOpen) => !isOpen && setModalDetails(null)}
        amount={modalDetails?.amount || 0}
        paymentType={modalDetails?.paymentType || 'Diária'}
      />

      <Dialog open={isCashFlowReportOpen} onOpenChange={setIsCashFlowReportOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Fluxo de Caixa Geral</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <PlayerCashFlowReport />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MeusPagamentos;