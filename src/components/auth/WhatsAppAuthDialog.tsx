import { formatPhoneForWhatsApp } from '@/utils/formatters';
/**
 * WhatsApp Authentication Component
 * 
 * Fluxo de autenticação via WhatsApp:
 * 1. Usuário digita número de telefone
 * 2. Sistema envia código via WhatsApp (template de autenticação)
 * 3. Usuário recebe código e digita
 * 4. Sistema valida e autentica
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { CampoDeCodigo } from '@/components/ui/CampoDeCodigo';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Smartphone,
  Lock,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface WhatsAppAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  whatsappAccountId: string;
}

type Step = 'phone' | 'code' | 'success';

export const WhatsAppAuthDialog: React.FC<WhatsAppAuthDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  whatsappAccountId,
}) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  
  
  // Countdown para reenvio
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhone('');
      setCode('');
      setError('');
      setCountdown(0);
      setRemainingAttempts(3);
    }
  }, [isOpen]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSendCode = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      // DDI pela fonte única: `55${x}` grudava o Brasil em número estrangeiro
      // e o código de verificação ia para um telefone que não existe.
      const fullPhone = formatPhoneForWhatsApp(phone);
      
      const response = await api.post('/auth/whatsapp/send/', {
        phone_number: `+${fullPhone}`,
        whatsapp_account_id: whatsappAccountId,
      });
      
      if (response.data.success) {
        setStep('code');
        setCountdown(60); // 1 minuto para reenviar
        toast.success('Código enviado! Verifique seu WhatsApp');
      } else {
        setError(response.data.message || 'Erro ao enviar código');
        if (response.data.retry_after) {
          setCountdown(response.data.retry_after);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      // DDI pela fonte única: `55${x}` grudava o Brasil em número estrangeiro
      // e o código de verificação ia para um telefone que não existe.
      const fullPhone = formatPhoneForWhatsApp(phone);
      
      const response = await api.post('/auth/whatsapp/resend/', {
        phone_number: `+${fullPhone}`,
        whatsapp_account_id: whatsappAccountId,
      });
      
      if (response.data.success) {
        setCountdown(60);
        setCode('');
        toast.success('Código reenviado! Verifique seu WhatsApp');
      } else {
        setError(response.data.message || 'Erro ao reenviar código');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

 // Recebe o código do CampoDeCodigo: ler `code` do estado aqui pegava o
  // valor de ANTES do último dígito (o envio automático rodava num setTimeout).
  const handleVerifyCode = async (codigo?: string) => {
    const fullCode = codigo ?? code;
    
    if (fullCode.length !== 6) {
      setError('Digite o código completo de 6 dígitos');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // DDI pela fonte única: `55${x}` grudava o Brasil em número estrangeiro
      // e o código de verificação ia para um telefone que não existe.
      const fullPhone = formatPhoneForWhatsApp(phone);
      
      const response = await api.post('/auth/whatsapp/verify/', {
        phone_number: `+${fullPhone}`,
        code: fullCode,
      });
      
      if (response.data.valid) {
        setStep('success');
        toast.success('Autenticação realizada! Bem-vindo!');
        
        setTimeout(() => {
          onSuccess(response.data.user);
          onClose();
        }, 1500);
      } else {
        setError(response.data.message || 'Código inválido');
        if (response.data.remaining_attempts !== undefined) {
          setRemainingAttempts(response.data.remaining_attempts);
        }
        setCode('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-success-token" />
            Login com WhatsApp
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-success-soft rounded-full flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-success-token" />
              </div>
              <p className="text-fg-muted-token">
                Digite seu número de WhatsApp para receber um código de verificação
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={15}
                className="text-lg text-center"
              />
            </div>
            
            <Button
              onClick={handleSendCode}
              disabled={isLoading || phone.replace(/\D/g, '').length < 10}
              className="w-full justify-center text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Código'
              )}
            </Button>
            
            <p className="text-xs text-center text-fg-muted-token">
              Você receberá um código de 6 dígitos no WhatsApp
            </p>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto mb-3 bg-success-soft rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-success-token" />
              </div>
              <p className="text-fg-muted-token">
                Digite o código de 6 dígitos enviado para
              </p>
              <p className="font-semibold text-lg">{phone}</p>
            </div>
            
            <div className="flex justify-center">
              <CampoDeCodigo
                rotulo="Código do WhatsApp"
                valor={code}
                onMudar={(c) => { setCode(c); setError(''); }}
                onCompleto={(c) => void handleVerifyCode(c)}
                erro={Boolean(error)}
                desabilitado={isLoading}
                autoFocus
              />
            </div>
            
            {remainingAttempts < 3 && (
              <p className="text-center text-sm text-warning-token">
                {remainingAttempts} tentativas restantes
              </p>
            )}
            
            <Button
              onClick={() => void handleVerifyCode()}
              disabled={isLoading || code.length !== 6}
              className="w-full justify-center text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>
            
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep('phone')}
                className="text-fg-muted-token"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              
              {countdown > 0 ? (
                <span className="text-sm text-fg-muted-token">
                  Reenviar em {countdown}s
                </span>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reenviar código
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-success-soft rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-success-token" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Autenticado!</h3>
            <p className="text-fg-muted-token">Redirecionando...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppAuthDialog;
