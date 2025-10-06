"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  amount: number;
  paymentType: 'Mensalidade' | 'Diária';
}

const PaymentModal = ({ isOpen, onOpenChange, amount, paymentType }: PaymentModalProps) => {
  const { toast } = useToast();
  const [details, setDetails] = useState({
    pixKey: '',
    qrCodeUrl: '',
    bankName: '',
    beneficiaryName: '',
    beneficiaryDocument: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchPaymentDetails = async () => {
        setLoading(true);
        try {
          const keysToFetch = [
            'pix_key_mensalista',
            'pix_qr_code_url_mensalista',
            'pix_key_diarista',
            'pix_qr_code_url_diarista',
            'bank_name',
            'beneficiary_name',
            'beneficiary_document'
          ];

          const { data, error } = await supabase
            .from('group_settings')
            .select('setting_key, setting_value')
            .in('setting_key', keysToFetch);

          if (error) throw error;

          const settings = data.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
          }, {} as Record<string, string>);
          
          const isMensalidade = paymentType === 'Mensalidade';

          setDetails({
            pixKey: settings[isMensalidade ? 'pix_key_mensalista' : 'pix_key_diarista'] || 'Chave PIX não configurada',
            qrCodeUrl: settings[isMensalidade ? 'pix_qr_code_url_mensalista' : 'pix_qr_code_url_diarista'] || '/placeholder.svg',
            bankName: settings['bank_name'] || 'Não configurado',
            beneficiaryName: settings['beneficiary_name'] || 'Não configurado',
            beneficiaryDocument: settings['beneficiary_document'] || 'Não configurado',
          });

        } catch (error: any) {
          showError("Erro ao carregar detalhes do pagamento: " + error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchPaymentDetails();
    }
  }, [isOpen, paymentType]);

  const handleCopy = () => {
    if (details.pixKey && details.pixKey !== 'Chave PIX não configurada') {
      navigator.clipboard.writeText(details.pixKey);
      toast({
        title: "Chave PIX copiada!",
        description: "A chave PIX foi copiada para a área de transferência.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar Pagamento - {paymentType}</DialogTitle>
          <DialogDescription>
            Use o QR Code ou a chave PIX abaixo para efetuar o pagamento.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valor a pagar</p>
              <p className="text-3xl font-bold">R$ {amount.toFixed(2)}</p>
            </div>
            <div className="flex justify-center">
              <img src={details.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg border bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chave PIX (Copia e Cola)</label>
              <div className="flex items-center gap-2">
                <Input value={details.pixKey} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              <p><strong>Banco:</strong> {details.bankName}</p>
              <p><strong>Beneficiário:</strong> {details.beneficiaryName}</p>
              <p><strong>CPF/CNPJ:</strong> {details.beneficiaryDocument}</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;