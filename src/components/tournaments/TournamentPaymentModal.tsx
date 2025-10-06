"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Importar Input
import { CopyIcon } from "lucide-react"; // Importar CopyIcon
import { showSuccess, showError } from "@/utils/toast";

interface TournamentPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  tournamentName: string;
  pixInfo?: string; // Nova prop para as informações PIX
}

const TournamentPaymentModal = ({ isOpen, onOpenChange, amount, tournamentName, pixInfo }: TournamentPaymentModalProps) => {
  const handleCopyPixInfo = async () => {
    if (!pixInfo) {
      showError("Nenhuma informação PIX disponível para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(pixInfo);
      showSuccess("Informações PIX copiadas para a área de transferência!");
    } catch (err) {
      showError("Erro ao copiar as informações PIX.");
      console.error("Failed to copy PIX info:", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pagamento da Inscrição</DialogTitle>
          <DialogDescription>
            Para se inscrever no torneio <strong>{tournamentName}</strong>, o valor de <strong>R$ {amount.toFixed(2)}</strong> é necessário.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Por favor, realize o pagamento via PIX para as informações abaixo. Após o pagamento, sua inscrição será confirmada.
          </p>
          {pixInfo ? (
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <label htmlFor="pix-info" className="sr-only">
                  Informações PIX
                </label>
                <Input
                  id="pix-info"
                  defaultValue={pixInfo}
                  readOnly
                />
              </div>
              <Button type="button" size="sm" className="px-3" onClick={handleCopyPixInfo}>
                <span className="sr-only">Copiar</span>
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-destructive">Nenhuma informação PIX configurada para este torneio. Entre em contato com o administrador.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Lembre-se de enviar o comprovante de pagamento para o administrador, se solicitado.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentPaymentModal;