"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SaveIcon, SettingsIcon, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import PixConfigDialog from "@/components/admin/PixConfigDialog";
import AdminLixeira from "@/components/admin/AdminLixeira";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import SendMessageForm from "@/components/admin/SendMessageForm"; // Importar o novo componente

const ConfiguracoesTab = () => {
  const [dueDate, setDueDate] = useState("10");
  const [monthlyFee, setMonthlyFee] = useState("50");
  const [dailyFee, setDailyFee] = useState("20");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(""); // Novo estado para o link do WhatsApp

  const [dbDueDate, setDbDueDate] = useState("10");
  const [dbMonthlyFee, setDbMonthlyFee] = useState("50");
  const [dbDailyFee, setDbDailyFee] = useState("20");
  const [dbWhatsappGroupLink, setDbWhatsappGroupLink] = useState(""); // Novo estado para o link do WhatsApp salvo no DB

  const [isPixConfigOpen, setIsPixConfigOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
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
        const currentWhatsappLink = settings['whatsapp_group_link'] || "";

        setDueDate(currentDueDate);
        setMonthlyFee(currentMonthlyFee);
        setDailyFee(currentDailyFee);
        setWhatsappGroupLink(currentWhatsappLink);

        setDbDueDate(currentDueDate);
        setDbMonthlyFee(currentMonthlyFee);
        setDbDailyFee(currentDailyFee);
        setDbWhatsappGroupLink(currentWhatsappLink);
      } catch (error: any) {
        showError(error.message || "Erro ao carregar configurações.");
      }
    };
    fetchSettings();
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

  return (
    <>
      <div className="space-y-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Financeiras</CardTitle>
            <CardDescription>Ajuste os valores de mensalidade, diárias e datas de vencimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Separator className="my-4" />
            <Button variant="outline" onClick={() => setIsPixConfigOpen(true)}>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Configurar Dados do PIX
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Comunicação</CardTitle>
            <CardDescription>Gerencie links de grupos e outras opções de comunicação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="whatsapp-link" className="text-sm font-medium flex-shrink-0">Link Grupo WhatsApp:</Label>
              <Input 
                id="whatsapp-link" 
                type="url" 
                className="flex-grow" 
                value={whatsappGroupLink} 
                onChange={(e) => setWhatsappGroupLink(e.target.value)} 
                placeholder="https://chat.whatsapp.com/..."
              />
              <Button 
                size="sm" 
                onClick={() => handleSettingSave('whatsapp_group_link', whatsappGroupLink, setDbWhatsappGroupLink)} 
                disabled={whatsappGroupLink === dbWhatsappGroupLink}
              >
                <SaveIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Enviar Mensagem Personalizada
            </CardTitle>
            <CardDescription>Envie mensagens diretas para jogadores ou grupos específicos.</CardDescription>
          </CardHeader>
          <CardContent>
            <SendMessageForm />
          </CardContent>
        </Card>
        
        <AdminLixeira />
      </div>

      <PixConfigDialog 
        isOpen={isPixConfigOpen}
        onOpenChange={setIsPixConfigOpen}
        onSuccess={() => {}}
      />
    </>
  );
};

export default ConfiguracoesTab;