import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { emailsService } from '@/services/emailsService';
import { coursesService } from '@/services/coursesService';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';

/**
 * EmailSend Page
 * pt-BR: Página do administrador para enviar e-mail de boas-vindas.
 *        Permite informar nome, e-mail e opcionalmente curso.
 * en-US: Admin page to send welcome emails.
 *        Allows entering name, email and optional course.
 */
export default function EmailSend() {
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Courses query
   * pt-BR: Carrega lista de cursos para o combobox com busca.
   * en-US: Loads course list for the combobox with search.
   */
  const coursesQuery = useQuery({
    queryKey: ['admin', 'courses', 'combo', searchTerm],
    queryFn: async () => coursesService.list({ search: searchTerm }),
    staleTime: 60_000,
  });

  /**
   * courseOptions
   * pt-BR: Mapeia cursos para opções do combobox.
   * en-US: Maps courses to combobox options.
   */
  const courseOptions = useComboboxOptions(
    useMemo(() => {
      const list = coursesQuery.data?.data || [];
      return list.map((c: any) => ({ value: String(c.id), label: c.nome || c.title || `Curso #${c.id}` }));
    }, [coursesQuery.data])
  );

  /**
   * sendWelcomeMutation
   * pt-BR: Dispara o envio de e-mail de boas-vindas via serviço de e-mails.
   * en-US: Triggers sending welcome email via emails service.
   */
  const sendWelcomeMutation = useMutation({
    mutationFn: async () => emailsService.sendWelcome({
      name,
      email,
      course_id: courseId || undefined,
      course_title: undefined,
    }),
    onSuccess: (res) => {
      toast({ title: 'E-mail enviado', description: res?.message || 'Boas-vindas enviadas com sucesso.' });
      setName('');
      setEmail('');
      setCourseId('');
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao enviar', description: String(err?.message || 'Falha ao enviar e-mail.'), variant: 'destructive' });
    },
  });

  /**
   * handleSubmit
   * pt-BR: Valida campos e envia o e-mail.
   * en-US: Validates fields and sends the email.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Informe nome e e-mail.' });
      return;
    }
    sendWelcomeMutation.mutate();
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Enviar e-mail</CardTitle>
          <CardDescription>Preencha os campos para enviar uma mensagem de boas-vindas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João Silva" />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label htmlFor="course">Curso (opcional)</Label>
              <Combobox
                options={courseOptions}
                value={courseId}
                onValueChange={(v) => setCourseId(v || '')}
                placeholder="Selecione um curso..."
                searchPlaceholder="Buscar curso..."
                onSearch={(term) => setSearchTerm(term)}
                searchTerm={searchTerm}
                loading={coursesQuery.isLoading}
              />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit" disabled={sendWelcomeMutation.isPending}>Enviar</Button>
              <Button type="button" variant="outline" onClick={() => { setName(''); setEmail(''); setCourseId(''); }}>Limpar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}