import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ValidationConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictType: 'email' | 'phone' | null;
  onRetry: () => void;
}

/**
 * ValidationConflictModal
 * pt-BR: Modal exibido quando o e-mail ou telefone já estão cadastrados. 
 *        Oferece opção de login ou correção.
 * en-US: Modal shown when email or phone is already registered.
 *        Offers login or correction options.
 */
export function ValidationConflictModal({
  open,
  onOpenChange,
  conflictType,
  onRetry,
}: ValidationConflictModalProps) {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {conflictType === 'email' ? 'E-mail em uso' : 'Telefone em uso'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Este {conflictType === 'email' ? 'e-mail' : 'número de telefone'} já está cadastrado em nosso sistema.
            Deseja fazer login na sua conta para continuar ou usar outro dado?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              // Small delay to allow modal to close before retry action (usually focus)
              setTimeout(() => {
                onRetry();
              }, 100);
            }}
          >
            Tentar outro
          </Button>
          <AlertDialogAction
            onClick={() => {
              // Redireciona para login enviando a URL atual como retorno
              const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
              navigate(`/login?redirect=${currentPath}`);
            }}
          >
            Fazer login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
