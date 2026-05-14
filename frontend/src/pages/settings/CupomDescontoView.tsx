import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Pencil, Check, X, Tag, Calendar, Hash, User, FileText, ShoppingBag, MessageCircle, Copy } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cupomService } from '@/services/cupomService';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

export default function CupomDescontoView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: cupom, isLoading } = useQuery({
    queryKey: ['cupons', 'getById', id],
    queryFn: () => cupomService.getById(Number(id)),
    enabled: !!id,
  });
  
  const { data: usages, isLoading: isLoadingUsages } = useQuery({
    queryKey: ['cupons', 'usages', id],
    queryFn: () => cupomService.getUsages(Number(id)),
    enabled: !!id,
  });

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [shareMessage, setShareMessage] = useState("");

  const defaultTemplate = "Olá! Aproveite este cupom de desconto *{cupom}* para o curso *{curso}*. Acesse agora e garanta sua vaga: {link}";

  const handleOpenShare = (course: any) => {
    setSelectedCourse(course);
    const baseUrl = window.location.origin;
    const checkoutUrl = `${baseUrl}/checkout/${course.slug}?cupom=${cupom?.codigo}`;
    
    let message = defaultTemplate
      .replace("{cupom}", cupom?.codigo || "")
      .replace("{curso}", course.titulo)
      .replace("{link}", checkoutUrl);
      
    setShareMessage(message);
    setShareModalOpen(true);
  };

  const handleConfirmShare = () => {
    const encodedMessage = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    setShareModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cupom) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-center text-muted-foreground">Cupom não encontrado.</p>
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate('/admin/settings/cupom-desconto')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupom: {cupom.codigo}</h1>
          <p className="text-sm text-muted-foreground">Detalhes do cupom de desconto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/settings/cupom-desconto')}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={() => navigate(`/admin/settings/cupom-desconto/${cupom.id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" /> Informações do Cupom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Código</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold uppercase">{cupom.codigo}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(cupom.codigo);
                    // Aqui poderia ter um toast, mas vou deixar simples
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <Badge variant="secondary">
                {cupom.tipo === "percentual" ? "Percentual (%)" : "Valor Fixo (R$)"}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Valor do Desconto</span>
              <span className="font-bold">
                {cupom.tipo === "percentual"
                  ? `${cupom.valor_desconto}%`
                  : `R$ ${cupom.valor_desconto}`}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Ativo</span>
              {cupom.ativo === "s" ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                  <Check className="w-3 h-3 mr-1" /> Sim
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-500 border-red-200">
                  <X className="w-3 h-3 mr-1" /> Não
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Validade e Limites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Início da Validade</span>
              <span className="font-medium">
                {cupom.validade_inicio
                  ? new Date(cupom.validade_inicio).toLocaleDateString("pt-BR")
                  : "Sem prazo"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Fim da Validade</span>
              <span className="font-medium">
                {cupom.validade_fim
                  ? new Date(cupom.validade_fim).toLocaleDateString("pt-BR")
                  : "Sem prazo"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" /> Usos / Limite
              </span>
              <span className="font-medium">
                {cupom.usos} / {cupom.limite_uso ?? "∞"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Valor Mínimo</span>
              <span className="font-medium">
                {cupom.valor_minimo
                  ? `R$ ${Number(cupom.valor_minimo).toFixed(2)}`
                  : "Sem mínimo"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Cursos Aplicáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cupom.cursos && cupom.cursos.length > 0 ? (
              <div className="flex flex-col gap-3">
                {cupom.cursos.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-primary/30 transition-colors">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{c.titulo}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                      onClick={() => handleOpenShare(c)}
                    >
                      <MessageCircle className="w-3 h-3" /> Compartilhar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Válido para todos os cursos.</p>
            )}
          </CardContent>
        </Card>

        {cupom.descricao && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Descrição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{cupom.descricao}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Criado em: {new Date(cupom.created_at).toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden mt-6">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black tracking-tight">Matrículas Beneficiadas</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lista de alunos que utilizaram este cupom</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingUsages ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !usages || usages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 opacity-20 mb-2" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-50">Nenhum uso registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/30 dark:bg-slate-800/30">
                  <TableRow>
                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">ID</TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Aluno</TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Curso</TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 text-center">Status</TableHead>
                    <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.map((enroll) => (
                    <TableRow key={enroll.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                      <TableCell className="px-8 py-4 font-mono text-[10px] font-bold text-muted-foreground/60">{String(enroll.id).padStart(4, '0')}</TableCell>
                      <TableCell className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-lg border-2 border-white dark:border-slate-950 shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px] uppercase">
                              {(enroll.cliente_nome || 'U').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-foreground/90">{enroll.cliente_nome}</span>
                            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{enroll.email || 'sem email'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-4 font-black text-[11px] text-foreground/80">{enroll.curso_nome}</TableCell>
                      <TableCell className="px-8 py-4 text-center">
                        <Badge className={`font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          String(enroll.situacao).toLowerCase().includes('mat') 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {enroll.situacao || 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          onClick={() => navigate(`/admin/school/enrollments/view/${enroll.id}`)}
                        >
                          <ChevronLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Personalizar Mensagem
            </DialogTitle>
            <DialogDescription className="text-xs">
              Edite a mensagem abaixo antes de enviar para o WhatsApp do cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Sua Mensagem</Label>
              <Textarea 
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                className="min-h-[150px] rounded-2xl border-slate-200 focus:ring-green-500/20 focus:border-green-500 font-medium text-sm leading-relaxed"
                placeholder="Digite a mensagem aqui..."
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dica:</p>
               <p className="text-[9px] text-muted-foreground/70">Use asteriscos para deixar o texto em *negrito* no WhatsApp.</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={() => setShareModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11">
              Cancelar
            </Button>
            <Button onClick={handleConfirmShare} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-[10px] tracking-widest h-11 px-8">
              <MessageCircle className="w-4 h-4 mr-2" /> Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
