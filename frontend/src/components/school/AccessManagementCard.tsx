import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, ShieldCheck, ShieldAlert, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdateEnrollment } from '@/hooks/enrollments';
import { toast } from 'sonner';

interface AccessManagementCardProps {
  enrollment: any;
}

/**
 * AccessManagementCard
 * pt-BR: Card para gestão de validade de acesso à matrícula.
 * en-US: Card for enrollment access validity management.
 */
export default function AccessManagementCard({ enrollment }: AccessManagementCardProps) {
  const [date, setDate] = useState<Date | undefined>(
    enrollment?.validade_acesso ? parseISO(enrollment.validade_acesso) : undefined
  );
  
  // Sincroniza estado local se a matrícula mudar (ex: após load inicial)
  useEffect(() => {
    if (enrollment?.validade_acesso) {
      setDate(parseISO(enrollment.validade_acesso));
    }
  }, [enrollment?.validade_acesso]);

  const { mutate: updateEnrollment, isPending } = useUpdateEnrollment();

  const handleUpdate = () => {
    if (!enrollment?.id) {
        toast.error('ID da matrícula não encontrado.');
        return;
    }
    
    // Garantir que a data seja enviada no formato YYYY-MM-DD para o backend
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;
    
    updateEnrollment(
        { 
            id: String(enrollment.id), 
            data: { validade_acesso: formattedDate } 
        },
        {
            onSuccess: () => {
                toast.success('Validade de acesso atualizada com sucesso!');
            },
            onError: (error: any) => {
                console.error('Update error:', error);
                toast.error('Erro ao atualizar validade de acesso.');
            }
        }
    );
  };

  const isExpired = date && isPast(date) && format(date, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');

  return (
    <Card className="border shadow-md overflow-hidden bg-white/50 backdrop-blur-sm ring-1 ring-black/5">
      <CardHeader className="bg-muted/30 border-b py-4 px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Gestão de Acesso
        </CardTitle>
        {isExpired ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider border border-red-200">
            <ShieldAlert className="h-3 w-3" />
            Expirado
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
            <ShieldCheck className="h-3 w-3" />
            Liberado
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-3">
             <div className="flex flex-col gap-1">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                   <CalendarIcon className="h-3 w-3" /> Data Limite de Conteúdo
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                   Determine até quando o aluno poderá acessar as atividades deste curso.
                </p>
             </div>
             
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-medium h-11 rounded-xl border-muted-foreground/20 bg-white",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary/60" />
                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Clique para selecionar</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
          </div>

          <div className="flex items-center gap-3">
              <Button 
                onClick={handleUpdate} 
                disabled={isPending}
                className="w-full md:w-auto px-8 h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(undefined)}
                className="text-xs text-muted-foreground hover:text-red-500 font-bold uppercase tracking-tighter"
              >
                Limpar
              </Button>
          </div>
        </div>
        
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
           <p className="text-[11px] text-primary/80 leading-relaxed font-medium">
             <strong className="uppercase">Nota:</strong> Se o campo estiver vazio, o acesso será considerado vitalício (ou conforme regra geral da turma). 
             Caso preenchido, o bloqueio ocorrerá às 23:59 da data selecionada.
           </p>
        </div>
      </CardContent>
    </Card>
  );
}
