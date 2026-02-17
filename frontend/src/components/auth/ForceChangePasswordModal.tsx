import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ShieldAlert, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Senha atual é obrigatória'),
  new_password: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres'),
  new_password_confirmation: z.string().min(6, 'A confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "As senhas não coincidem",
  path: ["new_password_confirmation"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * ForceChangePasswordModal
 * pt-BR: Modal obrigatório para troca de senha no primeiro acesso ou senha padrão.
 * en-US: Mandatory modal for password change on first access or default password.
 */
export function ForceChangePasswordModal() {
  const { forcePasswordChange, logout } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.changePassword(data as any);
      
      // Limpa a flag no localStorage após sucesso
      localStorage.removeItem('auth_force_password_change');
      
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Você já pode usar o sistema.",
      });
      
      // Força um reload para limpar o estado global e fechar o modal
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!forcePasswordChange) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto border-none shadow-2xl p-0 bg-white dark:bg-zinc-950">
        <div className="bg-primary/10 p-8 flex flex-col items-center text-center gap-4">
          <div className="p-3 bg-primary/20 rounded-2xl text-primary animate-bounce">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Ação Necessária</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400 mt-2">
              Por segurança, você precisa alterar sua senha inicial para continuar utilizando a plataforma.
            </DialogDescription>
          </div>
        </div>

        <div className="p-8 min-h-[400px] flex flex-col justify-between">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showCurrentPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-primary pr-10" 
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showNewPassword ? "text" : "password"} 
                            placeholder="Mínimo 6 caracteres" 
                            className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-primary pr-10" 
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="new_password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-primary pr-10" 
                            {...field} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold gap-2 shadow-lg shadow-primary/20" 
                  disabled={isLoading}
                >
                  {isLoading ? "Atualizando..." : "Atualizar Senha"}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" 
                  onClick={() => logout()}
                  disabled={isLoading}
                >
                  Sair do sistema
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
