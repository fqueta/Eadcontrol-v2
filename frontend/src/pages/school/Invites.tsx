import React, { useEffect, useMemo, useState } from 'react';
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
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
// Nota de layout:
// Admin pages are already wrapped by AppLayout via routing (App.tsx).
// Do not import or render AppLayout here to avoid duplicated headers/paddings.

/**
 * Invites (Admin)
 * pt-BR: Página de administração para gerar e listar links de convite.
 * en-US: Admin page to create and list invite links.
 */
/**
 * InvitesAdminPage
 * pt-BR: Página administrativa de convites. Não renderiza AppLayout aqui
 *        porque o roteamento já faz esse wrapper, evitando layout duplicado.
 * en-US: Admin invites page. Does not render AppLayout here, since routing
 *        wraps with AppLayout, preventing duplicated layout elements.
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

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerar link de convite</CardTitle>
            <CardDescription>Preencha os campos para criar um link de convite.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Convite Turma A" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="id_curso">Curso</Label>
                {/**
                 * Course Combobox
                 * pt-BR: Seleciona o curso usando Combobox com busca.
                 * en-US: Selects course using Combobox with search.
                 */}
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
              <div>
                <Label htmlFor="total_convites">Total de Convites</Label>
                <Input id="total_convites" type="number" value={totalConvites || ''} onChange={(e) => setTotalConvites(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="validade">Validade</Label>
                <Input id="validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
              </div>
              <div className="md:col-span-4">
                <Button type="submit" disabled={createMutation.isPending}>Gerar link</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convites gerados</CardTitle>
            <CardDescription>Lista com link e acompanhamento de uso.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">ID</th>
                      <th className="p-2">Nome</th>
                      <th className="p-2">Link</th>
                      <th className="p-2">Usados</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Validade</th>
                      <th className="p-2">Criado em</th>
                      <th className="p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-2">{r.id}</td>
                        <td className="p-2">{r.nome}</td>
                        <td className="p-2"><a href={r.link} target="_blank" rel="noreferrer" className="text-blue-600 underline">Abrir</a></td>
                        <td className="p-2">{r.usados}</td>
                        <td className="p-2">{r.total}</td>
                        <td className="p-2">{r.validade || '-'}</td>
                        <td className="p-2">{r.criado_em}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {/* Dropdown com ações */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2" aria-label="Mais ações">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                  setSharingInvite({ id: r.id, nome: r.nome, link: r.link });
                                  setSharePhone('');
                                  setShareMessage(`Convite: ${r.nome}`);
                                  setIsShareOpen(true);
                                }}>
                                  Compartilhar link
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
                                }}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setDeletingInvite({ id: r.id, nome: r.nome });
                                  setIsDeleteOpen(true);
                                }} className="text-red-600">Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
              >
                <div>
                  <Label htmlFor="edit_nome">Nome</Label>
                  <Input id="edit_nome" value={editingInvite.nome}
                    onChange={(e) => setEditingInvite({ ...editingInvite, nome: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
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
                    className="truncate"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_total">Total de Convites</Label>
                  <Input id="edit_total" type="number" value={editingInvite.total_convites || ''}
                    onChange={(e) => setEditingInvite({ ...editingInvite, total_convites: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_validade">Validade (YYYY-MM-DD)</Label>
                  <Input id="edit_validade" type="date" value={editingInvite.validade || ''}
                    onChange={(e) => setEditingInvite({ ...editingInvite, validade: e.target.value })}
                  />
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>Salvar</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Excluir convite</h3>
              <p>Tem certeza que deseja excluir "{deletingInvite?.nome}"?</p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>Excluir</Button>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Invite Modal */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          {/* pt-BR: Aumenta a largura do modal para melhor acomodar QR e campos */}
          {/* en-US: Increases modal width to better fit QR and fields */}
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>Compartilhar convite</DialogTitle>
              <DialogDescription>Copie o link, escaneie o QR Code ou envie via WhatsApp.</DialogDescription>
            </DialogHeader>
            {sharingInvite && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <Label htmlFor="share_link">Link do convite</Label>
                  <div className="flex gap-2">
                    <Input id="share_link" readOnly value={String(sharingInvite.link || '')} />
                    <Button type="button" variant="secondary" onClick={() => copyToClipboard(String(sharingInvite.link || ''))}>Copiar link</Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="share_phone">Enviar por WhatsApp</Label>
                    <div className="flex gap-2">
                      <Input
                        id="share_phone"
                        placeholder="+55 (11) 99999-9999"
                        value={sharePhone}
                        onChange={(e) => setSharePhone(phoneApplyMask(e.target.value))}
                      />
                      <Button type="button" onClick={handleSendWhatsApp}>Enviar</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Informe no formato internacional, sem símbolos. Ex.: 55DDDNNNNNNNN.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="share_message">Mensagem</Label>
                    <Textarea
                      id="share_message"
                      rows={3}
                      placeholder="Escreva uma mensagem opcional para enviar junto com o link"
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  {/* QR Code simples via serviço público */}
                  <img
                    alt="QR Code"
                    className="h-48 w-48 border rounded"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(String(sharingInvite.link || ''))}`}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsShareOpen(false)}>Fechar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}