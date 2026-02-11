import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { invitesService } from '@/services/invitesService';
import { coursesService } from '@/services/coursesService';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, Users, Link, Copy, Share2, Plus, Search, Trash2, Edit, Ticket } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import { Badge } from '@/components/ui/badge'; // Assuming Badge exists, if not will fix
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Assuming Table exists

// Nota de layout:
// Admin pages are already wrapped by AppLayout via routing (App.tsx).
// Do not import or render AppLayout here to avoid duplicated headers/paddings.

/**
 * Invites (Admin)
 * pt-BR: Página de administração para gerar e listar links de convite.
 * en-US: Admin page to create and list invite links.
 */
export default function InvitesAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [nome, setNome] = useState('');
  const [idCurso, setIdCurso] = useState<number>(0);
  const [totalConvites, setTotalConvites] = useState<number>(1);
  const [validade, setValidade] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState<string>('');
  // Edit/Delete state
  const [editingInvite, setEditingInvite] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [deletingInvite, setDeletingInvite] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  // Share state
  const [sharingInvite, setSharingInvite] = useState<any | null>(null);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [sharePhone, setSharePhone] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');

  /**
   * buildWhatsAppUrl
   * pt-BR: Monta a URL do WhatsApp Web/App com telefone e mensagem (link do convite).
   * en-US: Builds WhatsApp Web/App URL using phone and message (invite link).
   */
  const buildWhatsAppUrl = (phoneRaw: string, link: string, messageText?: string) => {
    // Normaliza telefone para apenas dígitos e garante DDI quando ausente
    let phone = phoneRemoveMask(String(phoneRaw || ''));
    if (!phone.startsWith('55')) {
      // Se parece nacional (<=11 dígitos), prefixa DDI BR
      if (phone.length <= 11) phone = `55${phone}`;
    }
    const message = messageText ? `${messageText}\n${link}` : link;
    const encoded = encodeURIComponent(message);
    // wa.me é recomendado; funciona no desktop e mobile.
    return `https://wa.me/${phone}?text=${encoded}`;
  };

  /**
   * handleSendWhatsApp
   * pt-BR: Abre nova aba/janela do WhatsApp com a mensagem e número informados.
   * en-US: Opens a new tab/window to WhatsApp with message and provided number.
   */
  const handleSendWhatsApp = () => {
    if (!sharingInvite?.link) return;
    if (!sharePhone) {
      toast({ title: 'Telefone obrigatório', description: 'Informe o telefone com DDD e país.', variant: 'destructive' });
      return;
    }
    const url = buildWhatsAppUrl(sharePhone, String(sharingInvite.link), shareMessage || String(sharingInvite.nome || 'Convite'));
    window.open(url, '_blank');
  };

  /**
   * copyToClipboard
   * pt-BR: Copia um texto para a área de transferência e mostra feedback.
   * en-US: Copies text to clipboard and shows feedback.
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Link copiado', description: 'O link foi copiado para a área de transferência.' });
    } catch (e: any) {
      toast({ title: 'Falha ao copiar', description: String(e?.message || 'Tente novamente.'), variant: 'destructive' });
    }
  };

  /**
   * invitesQuery
   * pt-BR: Busca lista de convites para exibir tabela.
   * en-US: Fetches invite list to display table.
   */
  const { data: invitesData, isLoading } = useQuery({
    queryKey: ['admin', 'invites', 'list'],
    queryFn: async () => invitesService.list({ per_page: 50 }),
  });

  /**
   * coursesQuery
   * pt-BR: Busca lista de cursos com suporte a busca para alimentar o Combobox.
   * en-US: Fetches course list with search support to feed the Combobox.
   */
  const coursesQuery = useQuery({
    queryKey: ['cursos', 'list', 200, courseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: courseSearch || undefined }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const courseItems = ((coursesQuery.data as any)?.data || (coursesQuery.data as any)?.items || []) as any[];
  const courseOptions = useComboboxOptions(courseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  /**
   * createMutation
   * pt-BR: Cria novo convite via serviço.
   * en-US: Creates a new invite via service.
   */
  const createMutation = useMutation({
    mutationFn: async () => invitesService.create({
      nome,
      id_curso: idCurso,
      total_convites: totalConvites,
      validade: validade || undefined,
    }),
    onSuccess: () => {
      toast({ title: 'Convite criado', description: 'Link gerado com sucesso.' });
      setNome('');
      setIdCurso(0);
      setTotalConvites(1);
      setValidade('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites', 'list'] });
    },
    onError: (err: any) => {
      const msg = String(err?.message || 'Falha ao criar convite');
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  /**
   * updateMutation
   * pt-BR: Atualiza um convite existente.
   * en-US: Updates an existing invite.
   */
  const updateMutation = useMutation({
    mutationFn: async () => invitesService.update(editingInvite.id, {
      nome: editingInvite.nome,
      id_curso: Number(editingInvite.id_curso) || undefined,
      total_convites: Number(editingInvite.total_convites) || undefined,
      validade: editingInvite.validade || undefined,
    }),
    onSuccess: () => {
      toast({ title: 'Convite atualizado', description: 'Link atualizado com sucesso.' });
      setIsEditOpen(false);
      setEditingInvite(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites', 'list'] });
    },
    onError: (err: any) => {
      const msg = String(err?.message || 'Falha ao atualizar convite');
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  /**
   * deleteMutation
   * pt-BR: Exclui um convite.
   * en-US: Deletes an invite.
   */
  const deleteMutation = useMutation({
    mutationFn: async () => invitesService.destroy(deletingInvite.id),
    onSuccess: () => {
      toast({ title: 'Convite excluído', description: 'Convite removido com sucesso.' });
      setIsDeleteOpen(false);
      setDeletingInvite(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites', 'list'] });
    },
    onError: (err: any) => {
      const msg = String(err?.message || 'Falha ao excluir convite');
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  /**
   * handleSubmit
   * pt-BR: Valida campos mínimos e dispara criação.
   * en-US: Validates minimal fields and fires creation.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || idCurso <= 0 || totalConvites < 1) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, curso e total.' });
      return;
    }
    createMutation.mutate();
  };

  const rows = useMemo(() => {
    const arr = (invitesData?.data || []) as any[];
    return arr.map((i) => ({
      id: i.id,
      nome: i.nome,
      slug: i.slug,
      link: i.link,
      total: i.total_convites,
      usados: i.convites_usados,
      validade: i.validade,
      criado_em: i.criado_em,
      id_curso: i.id_curso,
    }));
  }, [invitesData]);

  // Calculations for stats
  const totalCreated = rows.length;
  const totalUsed = rows.reduce((acc, curr) => acc + (Number(curr.usados) || 0), 0);

  return (
    <div className="space-y-8 p-1">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Convites</h2>
                <p className="text-muted-foreground">Gerencie os links de convite para matrícula de novos alunos.</p>
            </div>
            {/* Quick Stats */}
            <div className="flex gap-4 text-sm">
                <div className="bg-background border rounded-lg p-3 px-4 flex flex-col items-center min-w-[100px]">
                     <span className="text-muted-foreground text-xs font-medium">Convites Ativos</span>
                     <span className="text-xl font-bold">{totalCreated}</span>
                </div>
                 <div className="bg-background border rounded-lg p-3 px-4 flex flex-col items-center min-w-[100px]">
                     <span className="text-muted-foreground text-xs font-medium">Usados</span>
                     <span className="text-xl font-bold text-green-600">{totalUsed}</span>
                </div>
            </div>
        </div>

        {/* Create Invite Card */}
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Plus className="h-5 w-5" />
                </div>
                <div>
                    <CardTitle className="text-xl">Novo Convite</CardTitle>
                    <CardDescription>Preencha os dados abaixo para gerar um novo link de matrícula.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 space-y-2">
                <Label htmlFor="nome">Nome do Convite</Label>
                <div className="relative">
                    <Ticket className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Convite Turma A - 2024" />
                </div>
              </div>
              
              <div className="md:col-span-4 space-y-2">
                <Label htmlFor="id_curso">Curso Associado</Label>
                 <Combobox
                   options={courseOptions}
                   value={idCurso ? String(idCurso) : ''}
                   onValueChange={(v) => setIdCurso(Number(v || 0))}
                   placeholder="Selecione um curso..."
                   searchPlaceholder="Buscar curso..."
                   onSearch={(term) => setCourseSearch(term)}
                   searchTerm={courseSearch}
                   loading={coursesQuery.isLoading}
                   className="truncate"
                 />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="total_convites">Quantidade</Label>
                <div className="relative">
                    <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" id="total_convites" type="number" min={1} value={totalConvites || ''} onChange={(e) => setTotalConvites(Number(e.target.value))} />
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="validade">Validade (Opcional)</Label>
                <div className="relative">
                     <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" id="validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
                </div>
              </div>

              <div className="md:col-span-12 flex justify-end">
                <Button type="submit" disabled={createMutation.isPending} size="lg" className="w-full md:w-auto font-semibold">
                    {createMutation.isPending ? 'Gerando...' : 'Gerar Link de Convite'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Histórico de Convites</CardTitle>
                    <CardDescription>Acompanhe o uso dos links gerados.</CardDescription>
                </div>
                <div className="relative w-64 hidden md:block">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input placeholder="Buscar convites..." className="pl-9 h-9" />
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando convites...</div>
            ) : rows.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-2 text-muted-foreground">
                    <Ticket className="h-12 w-12 opacity-20" />
                    <p>Nenhum convite gerado ainda.</p>
                </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Link de Acesso</TableHead>
                      <TableHead className="text-center">Utilização</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                        const usagePercent = Math.min(100, Math.round((Number(r.usados) / Number(r.total)) * 100));
                        const isExpired = r.validade && new Date(r.validade) < new Date();
                        
                        return (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">#{r.id}</TableCell>
                        <TableCell className="font-medium text-foreground">{r.nome}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 max-w-[200px]">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded truncate flex-1 block">
                                    {r.link}
                                </code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(r.link)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-muted-foreground">{r.usados} / {r.total}</span>
                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${usagePercent >= 100 ? 'bg-red-500' : 'bg-primary'}`} 
                                        style={{ width: `${usagePercent}%` }} 
                                    />
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {r.validade ? (
                                <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-sm">{new Date(r.validade).toLocaleDateString('pt-BR')}</span>
                                    {isExpired && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Exp</span>}
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => {
                                setSharingInvite({ id: r.id, nome: r.nome, link: r.link });
                                setSharePhone('');
                                setShareMessage(`Convite: ${r.nome}`);
                                setIsShareOpen(true);
                              }}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Compartilhar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyToClipboard(r.link)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setEditingInvite({
                                  id: r.id,
                                  nome: r.nome,
                                  id_curso: r.id_curso,
                                  total_convites: r.total,
                                  validade: r.validade || '',
                                });
                                setIsEditOpen(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setDeletingInvite({ id: r.id, nome: r.nome });
                                setIsDeleteOpen(true);
                              }} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Invite Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar convite</DialogTitle>
              <DialogDescription>Atualize os campos do convite e salve.</DialogDescription>
            </DialogHeader>
            {editingInvite && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate();
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4"
              >
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="edit_nome">Nome</Label>
                  <div className="relative">
                    <Ticket className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="edit_nome" value={editingInvite.nome} className="pl-9"
                      onChange={(e) => setEditingInvite({ ...editingInvite, nome: e.target.value })}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="edit_id_curso">Curso</Label>
                  <Combobox
                    options={courseOptions}
                    value={editingInvite.id_curso ? String(editingInvite.id_curso) : ''}
                    onValueChange={(v) => setEditingInvite({ ...editingInvite, id_curso: Number(v || 0) })}
                    placeholder="Selecione um curso..."
                    searchPlaceholder="Buscar curso..."
                    onSearch={(term) => setCourseSearch(term)}
                    searchTerm={courseSearch}
                    loading={coursesQuery.isLoading}
                    className="truncate w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_total">Total</Label>
                  <div className="relative">
                    <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="edit_total" type="number" value={editingInvite.total_convites || ''} className="pl-9"
                      onChange={(e) => setEditingInvite({ ...editingInvite, total_convites: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_validade">Validade</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="edit_validade" type="date" value={editingInvite.validade || ''} className="pl-9"
                      onChange={(e) => setEditingInvite({ ...editingInvite, validade: e.target.value })}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-2 justify-end mt-4 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Salvar Alterações</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir convite?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja excluir o convite "{deletingInvite?.nome}"? Esta ação não pode ser desfeita e o link deixará de funcionar imediatamente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Invite Modal */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          {/* pt-BR: Aumenta a largura do modal para melhor acomodar QR e campos */}
          {/* en-US: Increases modal width to better fit QR and fields */}
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Compartilhar convite</DialogTitle>
              <DialogDescription>Use as opções abaixo para enviar o convite.</DialogDescription>
            </DialogHeader>
            {sharingInvite && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="share_link">Link do convite</Label>
                    <div className="flex gap-2">
                      <Input id="share_link" readOnly value={String(sharingInvite.link || '')} className="bg-muted" />
                      <Button type="button" variant="secondary" onClick={() => copyToClipboard(String(sharingInvite.link || ''))}>
                          <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-base">Enviar por WhatsApp</Label>
                     <div className="grid gap-3">
                        <div>
                             <Label htmlFor="share_phone" className="text-xs text-muted-foreground">Número (com DDD)</Label>
                             <Input
                                id="share_phone"
                                placeholder="+55 (11) 99999-9999"
                                value={sharePhone}
                                onChange={(e) => setSharePhone(phoneApplyMask(e.target.value))}
                              />
                        </div>
                        <div>
                             <Label htmlFor="share_message" className="text-xs text-muted-foreground">Mensagem Opcional</Label>
                             <Textarea
                                id="share_message"
                                rows={2}
                                placeholder="Olá! Segue seu link de inscrição..."
                                value={shareMessage}
                                onChange={(e) => setShareMessage(e.target.value)}
                              />
                        </div>
                        <Button type="button" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={handleSendWhatsApp}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Enviar via WhatsApp
                        </Button>
                     </div>
                  </div>
                </div>

                <div className="md:col-span-5 flex flex-col items-center justify-center bg-muted/30 rounded-lg p-4 border border-dashed">
                  <span className="text-sm font-medium mb-4 text-muted-foreground">QR Code para Acesso</span>
                  {/* QR Code simples via serviço público */}
                  <div className="bg-white p-2 rounded shadow-sm">
                    <img
                        alt="QR Code"
                        className="h-40 w-40"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(sharingInvite.link || ''))}`}
                    />
                  </div>
                  <p className="text-xs text-center mt-4 text-muted-foreground text-balance">Escaneie com a câmera do celular para acessar o link diretamente.</p>
                </div>

                <div className="md:col-span-12 flex justify-end gap-2 border-t pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsShareOpen(false)}>Fechar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}