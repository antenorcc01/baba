import { supabase } from "@/integrations/supabase/client";

export const updateUserPaymentStatus = async (playerId: string) => {
  if (!playerId) return;

  try {
    // 1. Obter as configurações do grupo (dia de vencimento)
    const { data: settingsData, error: settingsError } = await supabase
      .from('group_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'payment_due_day');
    
    if (settingsError) throw settingsError;

    const settings = settingsData.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, string>);

    const dueDateDay = parseInt(settings['payment_due_day'] || "10", 10);

    // 2. Verificar se existe um pagamento de mensalidade no mês atual
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id')
      .eq('player_id', playerId)
      .eq('category', 'Mensalidade')
      .gte('payment_date', firstDayOfMonth.toISOString())
      .lte('payment_date', lastDayOfMonth.toISOString());

    if (paymentsError) throw paymentsError;

    // 3. Determinar o novo status
    let newStatus: 'pago' | 'pendente' | 'atrasado' = 'atrasado';
    if (payments && payments.length > 0) {
      newStatus = 'pago';
    } else {
      if (today.getDate() <= dueDateDay) {
        newStatus = 'pendente';
      } else {
        newStatus = 'atrasado';
      }
    }

    // 4. Obter o perfil atual para verificar se a atualização é necessária
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('payment_status, is_mensalista')
      .eq('id', playerId)
      .single();

    if (profileError) throw profileError;

    // Atualizar apenas se o jogador for mensalista e o status tiver mudado
    if (profile.is_mensalista && profile.payment_status !== newStatus) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ payment_status: newStatus })
        .eq('id', playerId);

      if (updateError) throw updateError;
    }

  } catch (error) {
    console.error(`Falha ao atualizar o status de pagamento para o jogador ${playerId}:`, error);
  }
};