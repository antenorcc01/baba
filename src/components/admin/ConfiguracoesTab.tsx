"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SaveIcon, SettingsIcon, MessageCircle, UploadIcon, Loader2, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import PixConfigDialog from "@/components/admin/PixConfigDialog";
import AdminLixeira from "@/components/admin/AdminLixeira";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import SendMessageForm from "@/components/admin/SendMessageForm";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ConfiguracoesTab = () => {
  const { profile } = useAuth();
  // ... outros estados
  const [dueDate, setDueDate] = useState("10");
  const [monthlyFee, setMonthlyFee] = useState("50");
  const [dailyFee, setDailyFee] = useState("20");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [babaName, setBabaName] = useState("");
  const [babaLogoUrl, setBabaLogoUrl] = useState<string | null>("/favicon.png");
  const [gameTerm, setGameTerm] = useState("Baba");

  const [primaryColor, setPrimaryColor] = useState("#006437");
  const [secondaryColor, setSecondaryColor] = useState("#f0f9ff");
  const [accentColor, setAccentColor] = useState("#007a43");

  const [dbDueDate, setDbDueDate] = useState("10");
  const [dbMonthlyFee, setDbMonthlyFee] = useState("50");
  const [dbDailyFee, setDbDailyFee] = useState("20");
  const [dbWhatsappGroupLink, setDbWhatsappGroupLink] = useState("");
  const [dbBabaName, setDbBabaName] = useState("");
  const [dbBabaLogoUrl, setDbBabaLogoUrl] = useState<string | null>("/favicon.png");
  const [dbGameTerm, setDbGameTerm] = useState("Baba");

  const [dbPrimaryColor, setDbPrimaryColor] = useState("#006437");
  const [dbSecondaryColor, setDbSecondaryColor] = useState("#f0f9ff");
  const [dbAccentColor, setDbAccentColor] = useState("#007a43");

  const [isPixConfigOpen, setIsPixConfigOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!profile?.baba_id) return;

      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('group_settings')
          .select('setting_key, setting_value')
          .eq('baba_id', profile.baba_id);
        if (settingsError) console.warn("Could not fetch settings. Using defaults.");

        const settings = settingsData?.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {} as Record<string, string>) || {};

        const currentDueDate = settings['payment_due_day'] || "10";
        const currentMonthlyFee = settings['monthly_fee_amount'] || "50";
        const currentDailyFee = settings['daily_fee_amount'] || "20";
        const currentWhatsappLink = settings['whatsapp_group_link'] || "";
        const currentBabaName = settings['baba_name'] || "";
        const currentBabaLogoUrl = settings['baba_logo_url'] || "/favicon.png";
        const currentGameTerm = settings['game_term_singular'] || "Baba";
        const currentPrimaryColor = settings['theme_primary_color'] || "#006437";
        const currentSecondaryColor = settings['theme_secondary_color'] || "#f0f9ff";
        const currentAccentColor = settings['theme_accent_color'] || "#007a43";

        setDueDate(currentDueDate);
        setMonthlyFee(currentMonthlyFee);
        setDailyFee(currentDailyFee);
        setWhatsappGroupLink(currentWhatsappLink);
        setBabaName(currentBabaName);
        setBabaLogoUrl(currentBabaLogoUrl);
        setGameTerm(currentGameTerm);
        setPrimaryColor(currentPrimaryColor);
        setSecondaryColor(currentSecondaryColor);
        setAccentColor(currentAccentColor);

        setDbDueDate(currentDueDate);
        setDbMonthlyFee(currentMonthlyFee);
        setDbDailyFee(currentDailyFee);
        setDbWhatsappGroupLink(currentWhatsappLink);
        setDbBabaName(currentBabaName);
        setDbBabaLogoUrl(currentBabaLogoUrl);
        setDbGameTerm(currentGameTerm);
        setDbPrimaryColor(currentPrimaryColor);
        setDbSecondaryColor(currentSecondaryColor);
        setDbAccentColor(currentAccentColor);

      } catch (error: any) {
        showError(error.message || "Erro ao carregar configurações.");
      }
    };
    if (profile?.baba_id) {
      fetchSettings();
    }
  }, [profile?.baba_id]);

  const handleSettingSave = async (key: string, value: string, dbSetter: (val: string) => void) => {
    if (!profile?.baba_id) {
      showError("ID do Baba não encontrado. Não é possível salvar configurações.");
      return;
    }
    try {
      const { error: settingsError } = await supabase
        .from('group_settings')
        .upsert(
          { setting_key: key, setting_value: value, baba_id: profile.baba_id },
          { onConflict: 'setting_key,baba_id' }
        );
      
      if (settingsError) throw settingsError;

      if (key === 'baba_name') {
        const { error: tenantUpdateError } = await supabase
          .from('tenants')
          .update({ name: value })
          .eq('id', profile.baba_id);
        
        if (tenantUpdateError) throw tenantUpdateError;
      }

      dbSetter(value);
      showSuccess("Configuração atualizada com sucesso!");

      if (key === 'baba_name' || key.startsWith('theme_')) {
        showSuccess("Recarregue a página para ver as alterações de tema e nome.");
      }
    } catch (error: any) {
      showError(error.message || "Erro ao salvar configuração.");
    }
  };

  const handleTermSave = async () => {
    const pluralMap: { [key: string]: string } = {
      "Futebol": "Futebóis",
      "Pelada": "Peladas",
      "Racha": "Rachas",
      "Rachão": "Rachões",
      "Baba": "Babas",
    };
    const singular = gameTerm;
    const plural = pluralMap[singular] || `${singular}s`;

    try {
      await handleSettingSave('game_term_singular', singular, setDbGameTerm);
      await handleSettingSave('game_term_plural', plural, () => {}); // No dbSetter needed for plural
      showSuccess("Terminologia atualizada. A página será recarregada para aplicar as mudanças.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      // Error is already handled in handleSettingSave
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.baba_id) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.baba_id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      await handleSettingSave('baba_logo_url', publicUrl, setDbBabaLogoUrl);
      setBabaLogoUrl(publicUrl);
      showSuccess("Logo atualizada! A página será recarregada para exibir a nova imagem.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      showError(error.message || "Erro ao fazer upload da logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <>
      <div className="space-y-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Identidade Visual e Terminologia</CardTitle>
            <CardDescription>Personalize o nome, a logo e os termos usados no seu grupo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="baba-name" className="text-sm font-medium flex-shrink-0">Nome do Grupo:</Label>
              <Input 
                id="baba-name" 
                type="text" 
                className="flex-grow" 
                value={babaName} 
                onChange={(e) => setBabaName(e.target.value)} 
                placeholder="Ex: Baba dos Amigos"
              />
              <Button 
                size="sm" 
                onClick={() => handleSettingSave('baba_name', babaName, setDbBabaName)} 
                disabled={babaName === dbBabaName}
              >
                <SaveIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="game-term" className="text-sm font-medium flex-shrink-0">Termo para o Jogo:</Label>
              <Select value={gameTerm} onValueChange={setGameTerm}>
                <SelectTrigger id="game-term" className="flex-grow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baba">Baba</SelectItem>
                  <SelectItem value="Futebol">Futebol</SelectItem>
                  <SelectItem value="Pelada">Pelada</SelectItem>
                  <SelectItem value="Racha">Racha</SelectItem>
                  <SelectItem value="Rachão">Rachão</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={handleTermSave} 
                disabled={gameTerm === dbGameTerm}
              >
                <SaveIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Logo do Grupo</Label>
              <div className="flex items-center gap-4">
                <img 
                  src={babaLogoUrl || "/favicon.png"} 
                  alt="Logo do Baba" 
                  className="w-20 h-20 object-contain rounded-md border bg-muted p-1"
                />
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      {isUploadingLogo ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UploadIcon className="h-4 w-4 mr-2" />
                      )}
                      {isUploadingLogo ? "Enviando..." : "Alterar Logo"}
                    </Label>
                  </Button>
                  <Input 
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP até 5MB.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Personalização do Tema</CardTitle>
            <CardDescription>Escolha as cores principais do seu grupo. As alterações serão aplicadas após recarregar a página.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <Input id="primary-color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="p-1 h-10 w-14" />
                  <Input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  <Button size="sm" onClick={() => handleSettingSave('theme_primary_color', primaryColor, setDbPrimaryColor)} disabled={primaryColor === dbPrimaryColor}><SaveIcon className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <Input id="secondary-color" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="p-1 h-10 w-14" />
                  <Input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                  <Button size="sm" onClick={() => handleSettingSave('theme_secondary_color', secondaryColor, setDbSecondaryColor)} disabled={secondaryColor === dbSecondaryColor}><SaveIcon className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent-color">Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                  <Input id="accent-color" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="p-1 h-10 w-14" />
                  <Input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                  <Button size="sm" onClick={() => handleSettingSave('theme_accent_color', accentColor, setDbAccentColor)} disabled={accentColor === dbAccentColor}><SaveIcon className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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