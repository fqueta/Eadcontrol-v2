import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Settings, 
  Printer, 
  BookOpen, 
  CheckCircle2, 
  TrendingUp, 
  PlayCircle, 
  PauseCircle, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  CreditCard,
  MessageSquare,
  User,
  Calendar,
  Mail,
  Phone,
  Fingerprint,
  UserCog,
  Award,
  GraduationCap,
  LogIn,
  History,
  Activity as ActivityIcon
} from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbSeparator, 
  BreadcrumbPage 
} from '@/components/ui/breadcrumb';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { useEnrollment } from '@/hooks/enrollments';
import { useClientById } from '@/hooks/clients';
import { usersService } from '@/services/usersService';
import { coursesService } from '@/services/coursesService';
import { progressService } from '@/services/progressService';
import commentsService from '@/services/commentsService';
import { currencyRemoveMaskToNumber } from '@/lib/masks/currency';
import { formatDate } from '@/lib/utils';

// Reusing cards from school module
import BudgetPreview from '@/components/school/BudgetPreview';
import InstallmentPreviewCard from '@/components/school/InstallmentPreviewCard';

export default function EnrollmentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const navState = (location?.state || {}) as { returnTo?: string };

  const enrollmentId = id ? Number(id) : undefined;

  // 1. Fetch Enrollment & Relatives
  const { data: enrollment, isLoading: loadingEnroll } = useEnrollment(String(id || ''));

  const clientId = useMemo(() => {
    const v = (enrollment as any)?.id_cliente ?? (enrollment as any)?.client_id;
    return v ? String(v) : '';
  }, [enrollment]);

  const { data: client } = useClientById(clientId, { enabled: !!clientId });

  const courseId = useMemo(() => {
    const v = (enrollment as any)?.id_curso ?? (enrollment as any)?.course_id;
    return v ? Number(v) : undefined;
  }, [enrollment]);

  const { data: course } = useQuery({
    queryKey: ['courses', 'byId', courseId],
    queryFn: async () => (courseId ? coursesService.getById(courseId) : null),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Curriculum & Progress
  const { data: curriculum, isLoading: loadingCurriculum } = useQuery({
    queryKey: ['admin-enrollment-curriculum', enrollmentId],
    enabled: Boolean(enrollmentId),
    queryFn: async () => {
      if (!enrollmentId) return null;
      return progressService.getEnrollmentCurriculum(enrollmentId);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Collect all activity IDs of this course for filtering comments
  const courseActivityIds = useMemo(() => {
    const ids = new Set<number>();
    const mods: any[] = Array.isArray((curriculum as any)?.curriculum) ? (curriculum as any).curriculum : [];
    mods.forEach((m: any) => {
      const acts: any[] = Array.isArray(m?.atividades) ? m.atividades : [];
      acts.forEach((a: any) => {
        if (a?.id || a?.ID) ids.add(Number(a.id || a.ID));
      });
    });
    return ids;
  }, [curriculum]);

  // 3. Fetch Student Comments (using filters for Activities)
  const { data: studentComments, isLoading: loadingComments } = useQuery({
    queryKey: ['admin-student-comments', clientId, courseId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      // Filter by student and type 'Activity'
      const res: any = await commentsService.adminList(undefined, 1, 100, clientId, 'App\\Models\\Activity');
      const allComments = Array.isArray(res?.data) ? res.data : [];
      
      // Client-side filter: only comments belonging to the current course's activities
      return allComments.filter((c: any) => courseActivityIds.has(Number(c.commentable_id)));
    },
  });

  // 4. Fetch Access Logs (Tracking Events)
  const { data: accessLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-enrollment-logs', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const res = await usersService.getTrackingEvents({ 
        user_id: clientId, 
        per_page: 50 
      });
      return res?.data || [];
    }
  });

  // --- Handlers & Helpers ---

  const handleBack = () => {
    if (navState?.returnTo && typeof navState.returnTo === 'string') {
      navigate(navState.returnTo);
      return;
    }
    navigate('/admin/school/enroll');
  };

  const handlePrint = () => {
    try { window.print(); } catch {}
  };

  /**
   * handleEditClient
   * pt-BR: Navega para a edição do cliente injetando a localização atual no estado
   *        para que o formulário saiba para onde voltar após salvar.
   * en-US: Navigates to client edit injecting current location in state
   *        so the form knows where to return after saving.
   */
  const handleEditClient = () => {
    if (!clientId) return;
    navigate(`/admin/clients/${clientId}/edit`, { 
      state: { 
        from: location 
      } 
    });
  };

  /**
   * handleImpersonate
   * pt-BR: Realiza a personificação do aluno (login como).
   * en-US: Performs student impersonation (login as).
   */
  const handleImpersonate = async () => {
    if (!clientId) return;
    
    try {
      const res = await usersService.impersonate(clientId);
      
      // Salva o token original para "deslogar" depois se necessário
      const originalToken = localStorage.getItem('auth_token');
      if (originalToken) {
        localStorage.setItem('admin_token_snapshot', originalToken);
      }
      
      // Sobrescreve sessão com a do aluno
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user_menu', JSON.stringify(res.menu));
      localStorage.setItem('user_data', JSON.stringify(res.user));
      
      toast({ title: 'Acesso Concedido', description: `Você agora está acessando como ${res.user.name}` });
      
      // Redireciona para o painel do aluno ou página do curso específico
      const slug = (course as any)?.slug ?? (course as any)?.url;
      const redirectPath = slug ? `/aluno/cursos/${slug}` : (res.redirect || '/aluno');
      
      // Use window.location.href para forçar o recarregamento total do estado da aplicação (menus, permissões, etc.)
      window.location.href = redirectPath;
      
    } catch (err: any) {
      toast({ 
        title: 'Falha no Acesso', 
        description: err.message || 'Não foi possível acessar a conta do aluno.', 
        variant: 'destructive' 
      });
    }
  };

  /**
   * handleGenerateCertificate
   * pt-BR: Gera o PDF do certificado usando jsPDF e os dados carregados na página.
   * en-US: Generates the certificate PDF using jsPDF and the data loaded on the page.
   */
  const handleGenerateCertificate = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const studentName = clientName || 'Nome do Aluno';
      const courseName = courseTitle || 'Curso Online';
      const duration = (course as any)?.duracao ? `${(course as any).duracao} ${(course as any).unidade_duracao || 'horas'}` : '??';
      const dateStr = new Date().toLocaleDateString('pt-BR');

      // Frame
      doc.setDrawColor(200, 160, 50);
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, 267, 180);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(30);
      doc.setTextColor(50, 50, 50);
      doc.text('CERTIFICADO DE CONCLUSÃO', 148.5, 50, { align: 'center' });
      
      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Certificamos que', 148.5, 75, { align: 'center' });
      
      // Student Name
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(28);
      doc.setTextColor(30, 30, 30);
      doc.text(studentName, 148.5, 95, { align: 'center' });
      
      // Body
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(`concluiu com êxito o curso de`, 148.5, 115, { align: 'center' });
      
      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(200, 160, 50); 
      doc.text(courseName, 148.5, 130, { align: 'center' });
      
      // Final details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`realizado em ${dateStr}, com carga horária de ${duration}.`, 148.5, 150, { align: 'center' });
      
      // Signature
      doc.setLineWidth(0.5);
      doc.line(80, 175, 217, 175);
      doc.setFontSize(10);
      doc.text('Diretoria Acadêmica', 148.5, 182, { align: 'center' });
      
      doc.save(`certificado_${studentName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
      toast({ title: 'Sucesso', description: 'Certificado gerado com sucesso.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao gerar o PDF.', variant: 'destructive' });
    }
  };

  const computeValidityDate = (daysStr?: string): string => {
    const days = parseInt(String(daysStr ?? ''), 10);
    if (!Number.isFinite(days) || days <= 0) return '';
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('pt-BR');
  };

  const formatCurrencyBRL = (value: number): string => {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    } catch {
      return `R$ ${(Number(value) || 0).toFixed(2)}`;
    }
  };

  const maskMonetaryDisplay = (raw: string | number | undefined | null): string => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const num = currencyRemoveMaskToNumber(s);
    return formatCurrencyBRL(num);
  };

  const computeModulo = (enr: any, cursoTipo: string) => {
    try {
      if (String(cursoTipo) === '4') {
         return enr?.orc?.modulos?.[0] ?? '';
      }
      return enr?.orc?.modulo ?? '';
    } catch {
      return '';
    }
  };

  // --- Derived State ---
  const clientName = client?.name || (client as any)?.nome || (curriculum as any)?.student_name || 'Cliente não identificado';
  const clientPhone = client?.celular || client?.config?.celular || client?.config?.telefone_residencial || '';
  const clientEmail = client?.email || '';
  const clientCpf = client?.cpf || '';
  
  const courseTitle = (course as any)?.titulo || (course as any)?.nome || (curriculum as any)?.course_title || 'Curso não identificado';
  
  const subtotalMasked = useMemo(() => maskMonetaryDisplay((enrollment as any)?.subtotal), [enrollment]);
  const totalMasked = useMemo(() => maskMonetaryDisplay((enrollment as any)?.total), [enrollment]);
  const descontoMasked = useMemo(() => maskMonetaryDisplay((enrollment as any)?.desconto), [enrollment]);
  const validadeDias = useMemo(() => String((enrollment as any)?.validade || '14'), [enrollment]);
  const curso_tipo = String((enrollment as any)?.curso_tipo || '');
  const modulo = computeModulo(enrollment as any, curso_tipo);
  
  const parcelamento = useMemo(() => {
    return ((enrollment as any)?.orc?.parcelamento ?? null) as any;
  }, [enrollment]);

  const isActive = useMemo(() => {
    return (enrollment as any)?.ativo === 's' || (enrollment as any)?.ativo === 1;
  }, [enrollment]);

  // Progress Calculations
  const { total, completed, percent } = useMemo(() => {
    const mods: any[] = Array.isArray((curriculum as any)?.curriculum) ? (curriculum as any).curriculum : [];
    let t = 0; let c = 0;
    mods.forEach((m: any) => {
      const acts: any[] = Array.isArray(m?.atividades) ? m.atividades : [];
      acts.forEach((a: any) => { t += 1; if (a?.completed) c += 1; });
    });
    const pct = t > 0 ? Math.round((c / t) * 100) : 0;
    return { total: t, completed: c, percent: pct };
  }, [curriculum]);

  const nextActivityTitle = useMemo(() => {
    const mods: any[] = Array.isArray((curriculum as any)?.curriculum) ? (curriculum as any).curriculum : [];
    const acts: any[] = [];
    mods.forEach((m: any) => {
      const arr = Array.isArray(m?.atividades) ? m.atividades : [];
      arr.forEach((a: any) => acts.push({ m, a }));
    });
    const resume = acts.find((it) => Boolean(it.a?.needs_resume) && !Boolean(it.a?.completed));
    const firstPending = acts.find((it) => !Boolean(it.a?.completed));
    const chosen = resume || firstPending;
    return chosen ? String(chosen.a?.titulo || chosen.a?.title || '') : '';
  }, [curriculum]);

  // Pace/Health Calculation
  const paceInfo = useMemo(() => {
    if (!enrollment || percent === undefined) return null;
    
    const startStr = (enrollment as any)?.data_matricula || (enrollment as any)?.created_at;
    if (!startStr) return null;
    
    const start = new Date(startStr);
    const now = new Date();
    
    const validade = Number((enrollment as any)?.validade);
    const totalDays = isNaN(validade) || validade <= 0 ? 365 : validade;
    
    const elapsedMs = now.getTime() - start.getTime();
    const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
    
    const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
    const diff = percent - expectedProgress;
    
    let status: 'ideal' | 'ahead' | 'behind' | 'critical' = 'ideal';
    let label = 'No Ritmo';
    let color = 'text-emerald-600';
    let bgColor = 'bg-emerald-50';
    let icon = CheckCircle2;

    if (diff < -20) {
      status = 'critical';
      label = 'Ritmo Crítico';
      color = 'text-red-600';
      bgColor = 'bg-red-50';
      icon = ShieldAlert;
    } else if (diff < -5) {
      status = 'behind';
      label = 'Atrasado';
      color = 'text-amber-600';
      bgColor = 'bg-amber-50';
      icon = Clock;
    } else if (diff > 15) {
      status = 'ahead';
      label = 'Acelerado';
      color = 'text-blue-600';
      bgColor = 'bg-blue-50';
      icon = TrendingUp;
    }

    return {
      expectedProgress: Math.round(expectedProgress),
      diff: Math.round(diff),
      status,
      label,
      color,
      bgColor,
      icon,
      elapsedDays,
      totalDays
    };
  }, [enrollment, percent]);

  function renderActivityItem(m: any, a: any, idx: number) {
    const title = String(a?.titulo || a?.title || `Atividade ${idx + 1}`);
    const Icon = a?.completed ? CheckCircle2 : (a?.needs_resume ? PlayCircle : PauseCircle);
    const badgeVariant = a?.completed ? 'default' : (a?.needs_resume ? 'secondary' : 'outline');
    const opacityClass = a?.completed ? 'opacity-60' : '';
    const lastView = a?.updated_at ? formatDate(a.updated_at) : null;
    
    return (
      <div className={`flex items-center justify-between p-4 ${opacityClass}`}>
        <div className="flex items-center gap-4">
           <div className={`p-2 rounded-full ${a?.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              <Icon className="h-5 w-5" />
           </div>
           <div>
              <div className="font-bold text-sm text-foreground">{title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                 {Number(a?.seconds || 0) > 0 && (
                    <span className="flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded text-[10px]">
                       <Clock className="h-3 w-3" /> {Math.round(Number(a.seconds))}s
                    </span>
                 )}
                 {a?.tipo && <span className="uppercase text-[10px] tracking-wider font-bold">{a.tipo}</span>}
              </div>
           </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {a?.completed ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-3 py-1">
                   <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Concluída
                </Badge>
            ) : a?.needs_resume ? (
                <Badge variant="secondary" className="px-3 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                   <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Retomar
                </Badge>
            ) : (
                <Badge variant="outline" className="text-muted-foreground border-dashed">
                   Pendente
                </Badge>
            )}
          </div>
          {lastView && (
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              Visto em: {lastView}
            </span>
          )}
        </div>
      </div>
    );
  }

  function ActivityTimeline() {
    if (loadingLogs) return <div className="p-8 text-center animate-pulse">Carregando logs de acesso...</div>;
    
    const logs = Array.isArray(accessLogs) ? accessLogs : [];

    if (logs.length === 0) {
      return (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <History className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium text-lg">Nenhum log de acesso encontrado</p>
            <p className="text-sm">As atividades do aluno serão registradas aqui em breve.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground/80 flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Histórico de Interações
          </h3>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {logs.length} registros recentes
          </Badge>
        </div>

        <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:left-[15px] before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-muted before:to-transparent">
          {logs.map((log: any, idx: number) => {
            const date = new Date(log.created_at);
            const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const isView = log.event_type === 'view';
            const resourceTitle = log.resource?.title || 'Página desconhecida';
            
            return (
              <div key={log.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="absolute -left-8 top-1.5 h-4 w-4 rounded-full border-2 border-background bg-primary shadow-sm z-10 group-hover:scale-125 transition-transform" />
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm group-hover:shadow-md transition-all group-hover:border-primary/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                       <div className={`p-1.5 rounded-lg ${isView ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {isView ? <BookOpen className="h-4 w-4" /> : <ActivityIcon className="h-4 w-4" />}
                       </div>
                       <span className="font-bold text-sm text-foreground/80">
                         {isView ? 'Visualizou Conteúdo' : 'Interação Registrada'}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 px-2 py-1 rounded-full">
                       <Clock className="h-3 w-3" /> {formattedDate} às {formattedTime}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-foreground/70 mb-2 pl-1 italic">
                    "{resourceTitle}"
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3 items-center">
                    <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/10 bg-muted/20">
                      IP: {log.ip_address || '---'}
                    </Badge>
                    {log.resource_type && (
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/10 text-primary/70">
                        {log.resource_type.split('\\').pop()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loadingEnroll && !enrollment) {
    return <div className="p-8 text-center animate-pulse">Carregando dados da matrícula...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <Breadcrumb className="bg-muted/30 px-4 py-2 rounded-lg border w-fit">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/school/enroll" className="hover:text-primary transition-colors font-medium">Matrículas</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-bold text-primary">Visualizar #{String(id)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex gap-2 no-print">
          <Button variant="ghost" size="sm" onClick={handleBack} title="Voltar" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/sales/proposals/edit/${id}`)} className="shadow-sm border-muted-foreground/20 hover:bg-muted font-semibold">
            <Settings className="h-4 w-4 mr-2" /> Editar Matrícula
          </Button>
          <Button size="sm" onClick={handlePrint} className="font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
             <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Hero Summary Section */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <div className="space-y-5 max-w-2xl">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground/90">{clientName}</h2>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors" 
                    title="Editar cadastro do aluno"
                    onClick={handleEditClient}
                  >
                    <UserCog className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-emerald-100 hover:text-emerald-600 transition-colors" 
                    title="Acessar como aluno (Impersonate)"
                    onClick={handleImpersonate}
                  >
                    <LogIn className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <p className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 opacity-60" /> {courseTitle}
              </p>
            </div>

            {/* Student Details (Email, Phone, CPF) */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {clientEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-muted-foreground/5">
                  <Mail className="h-3.5 w-3.5 text-primary/60" />
                  <span className="font-medium">{clientEmail}</span>
                </div>
              )}
              {clientPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-muted-foreground/5">
                  <Phone className="h-3.5 w-3.5 text-primary/60" />
                  <span className="font-medium">{clientPhone}</span>
                </div>
              )}
              {clientCpf && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-muted-foreground/5">
                  <Fingerprint className="h-3.5 w-3.5 text-primary/60" />
                  <span className="font-medium">CPF: {clientCpf}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 rounded-2xl bg-primary/10 border border-primary/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Valor da Matrícula</span>
                <span className="text-xl font-black text-primary">{totalMasked || 'R$ 0,00'}</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-muted/50 border border-muted/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ID da Matrícula</span>
                <span className="text-xl font-black text-foreground/70">{id}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 text-sm w-full md:w-auto">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border shadow-sm">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {clientName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Status Operacional</span>
                <span className={`font-bold uppercase tracking-wider ${isActive ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-3">
        <Card className="shadow-sm border-muted/60 bg-muted/5 print:border print:bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conteúdos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Aulas no curso</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60 bg-muted/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{completed}</div>
            <p className="text-xs text-muted-foreground">Atividades finalizadas</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm border-muted/60 ${paceInfo?.bgColor || 'bg-muted/5'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${paceInfo?.color || ''}`}>Saúde da Matrícula</CardTitle>
            {paceInfo ? <paceInfo.icon className={`h-4 w-4 ${paceInfo.color}`} /> : <ActivityIcon className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${paceInfo?.color || ''}`}>
              {paceInfo?.label || 'Ideal'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paceInfo ? (
                paceInfo.diff >= 0 
                  ? `Está ${paceInfo.diff}% acima do ritmo ideal`
                  : `Está ${Math.abs(paceInfo.diff)}% abaixo do esperado`
              ) : 'Ritmo baseado no tempo de acesso'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1 print:gap-2">
        <Card className="shadow-sm border-muted/60 bg-muted/5 print:border print:bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Detalhado</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
               <div className="text-2xl font-bold text-primary">{percent}% concluído</div>
               <div className="text-xs text-muted-foreground">{completed} de {total} aulas</div>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-muted-foreground/5 shadow-inner">
               <div className="h-full bg-primary transition-all duration-700 ease-in-out" style={{ width: `${percent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-500/20 bg-emerald-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Onde o aluno parou?</CardTitle>
            <PlayCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
             {nextActivityTitle ? (
               <div className="flex items-center gap-3">
                 <div className="flex-1">
                    <div className="text-sm font-bold text-emerald-900 line-clamp-1 leading-tight">
                        {nextActivityTitle}
                    </div>
                    <p className="text-xs text-emerald-600/80 mt-1 font-medium">
                        Próxima atividade na trilha
                    </p>
                 </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={handleImpersonate}>
                    <ArrowRight className="h-4 w-4" />
                 </Button>
               </div>
             ) : (
                <>
                 <div className="text-sm font-bold text-muted-foreground text-center py-2">✨ Curso Finalizado!</div>
                </>
             )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="geral" className="rounded-lg px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BookOpen className="h-4 w-4 mr-2" /> Trilha Acadêmica
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="rounded-lg px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4 mr-2" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4 mr-2" /> Logs de Acesso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-8 animate-in fade-in duration-300 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              {/* Certification Card (Moved from Edit page) */}
              <Card className="border shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b py-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" />
                      Certificação
                    </CardTitle>
                    <CardDescription>Emissão e controle de certificados de conclusão.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 space-y-4 w-full">
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                              <div className="flex items-center gap-2 mb-2">
                                  <GraduationCap className="h-5 w-5 text-amber-600" />
                                  <h3 className="font-bold text-amber-800">Certificado de Conclusão</h3>
                              </div>
                              <p className="text-xs text-amber-700/80 mb-4">
                                  Emitido com base no progresso acadêmico atual.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs text-amber-900/60 mb-2">
                                  <div><strong>Aluno:</strong> {clientName}</div>
                                  <div><strong>Curso:</strong> {courseTitle}</div>
                                  <div><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
                                  <div><strong>Carga Horária:</strong> {(course as any)?.duracao ? `${(course as any).duracao} ${(course as any).unidade_duracao || 'horas'}` : '---'}</div>
                              </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <Button
                              type="button"
                              onClick={handleGenerateCertificate}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20"
                              disabled={percent < 100 && !isActive} // Exemplo de trava lógica se desejar
                            >
                              <Award className="h-4 w-4 mr-2" />
                              Baixar Certificado PDF
                            </Button>
                        </div>
                    </div>
                </CardContent>
              </Card>

              {/* Student Comments Card */}
              <Card className="shadow-sm border-muted/60 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Dúvidas em Aula (Este Curso)</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-bold">
                      {studentComments?.length || 0}
                    </Badge>
                  </div>
                  <CardDescription>Comentários realizados nas atividades deste currículo.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[600px] overflow-y-auto custom-scrollbar">
                    {loadingComments ? (
                      <div className="p-8 text-center animate-pulse text-muted-foreground">Buscando interações...</div>
                    ) : studentComments && studentComments.length > 0 ? (
                      studentComments.map((comment: any) => (
                        <div key={comment.id} className="p-4 hover:bg-muted/20 transition-colors space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={comment.status === 'approved' ? 'outline' : 'secondary'} className={`text-[10px] uppercase font-bold ${comment.status === 'approved' ? 'text-emerald-600 border-emerald-100 bg-emerald-50/30' : 'text-amber-600 border-amber-100 bg-amber-50/30'}`}>
                              {comment.status === 'approved' ? 'Aprovado' : 'Pendente'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                            "{comment.body}"
                          </p>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-black text-primary uppercase tracking-tight">Aula:</span>
                            <span className="font-bold text-muted-foreground">{comment.commentable_title || `Atividade #${comment.commentable_id}`}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">Nenhum comentário registrado nestas atividades.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4 px-1 border-b pb-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">Currículo e Progresso</h2>
              </div>
              
              {Array.isArray((curriculum as any)?.curriculum) && (curriculum as any).curriculum.length > 0 ? (
                <div className="space-y-6 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
                   {(curriculum as any).curriculum.map((m: any, mi: number) => {
                      const activities = Array.isArray(m?.atividades) ? m.atividades : [];
                      const completedCount = activities.filter((a: any) => a?.completed).length;
                      const totalCount = activities.length;
                      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      
                      return (
                      <div key={mi} className="border rounded-xl overflow-hidden bg-card shadow-sm transition-all hover:shadow-md">
                         <div className="bg-muted/30 px-6 py-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div>
                               <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                  <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">Módulo {mi + 1}</span>
                                  {String(m?.titulo || m?.title || '')}
                               </h3>
                               <p className="text-sm text-muted-foreground mt-1 ml-1 pl-0.5">
                                  {completedCount} de {totalCount} atividades concluídas
                               </p>
                            </div>
                            <div className="flex items-center gap-4 min-w-[150px]">
                               <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                               </div>
                               <span className="text-sm font-bold text-muted-foreground w-10 text-right">{progress}%</span>
                            </div>
                         </div>
                         
                         <div className="divide-y">
                            {activities.length > 0 ? (
                            activities.map((a: any, ai: number) => (
                               <div key={`${mi}-${ai}`} className="group hover:bg-muted/20 transition-colors">
                                  {renderActivityItem(m, a, ai)}
                               </div>
                            ))
                            ) : (
                            <div className="p-8 text-center text-muted-foreground/50 text-sm italic">
                               Nenhuma atividade neste módulo.
                            </div>
                            )}
                         </div>
                      </div>
                      );
                   })}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                   <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                   <p className="text-lg font-medium text-muted-foreground">Sem currículo</p>
                   <p className="text-sm text-muted-foreground/60">Conteúdo programático não iniciado ou vazio.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-8 animate-in fade-in duration-300 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="flex items-center gap-2 mb-4 px-1 border-b pb-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">Dados Financeiros</h2>
              </div>
              
              <BudgetPreview
                title="Detalhes Financeiros"
                description="Confira os detalhes financeiros associados a esta matrícula."
                clientName={clientName}
                clientId={client?.id ? String(client.id) : undefined}
                clientPhone={clientPhone}
                clientEmail={clientEmail}
                course={course as any}
                module={modulo}
                discountLabel="Desconto Aplicado"
                discountAmountMasked={descontoMasked}
                subtotalMasked={subtotalMasked}
                totalMasked={totalMasked}
                validityDate={computeValidityDate(validadeDias)}
              />
            </div>
            
            <div className="space-y-8 pt-10">
              <InstallmentPreviewCard title="Condições de Parcelamento" parcelamento={parcelamento} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="animate-in fade-in slide-in-from-top-2 duration-500">
           <ActivityTimeline />
        </TabsContent>
      </Tabs>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0.5cm; }
          body { 
            background: white !important; 
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print, [role="tablist"], .sidebar, nav, header, footer, button, .breadcrumb-link {
            display: none !important;
          }
          .container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          /* Tighten vertical spacing */
          .space-y-8 > * + * { margin-top: 0.75rem !important; }
          .space-y-6 > * + * { margin-top: 0.5rem !important; }
          .space-y-10 > * + * { margin-top: 1rem !important; }
          
          /* Hero/Header section reduction */
          .p-8, .md\\:p-10 { padding: 1rem !important; }
          .gap-8 { gap: 0.75rem !important; }
          .mb-12 { margin-bottom: 0.5rem !important; }

          /* Card/Section reduction */
          .card, .Card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            background: white !important;
            margin-bottom: 0.5rem !important;
            border-radius: 8px !important;
          }
          .card-header, .CardHeader { padding: 0.5rem 1rem !important; }
          .card-content, .CardContent { padding: 0.75rem 1rem !important; }

          /* Typography reduction */
          h1, .text-3xl, .md\\:text-5xl { 
            font-size: 1.4rem !important; 
            font-weight: 800 !important;
            line-height: 1.1 !important;
            color: black !important;
          }
          h2, .text-xl, .text-2xl { 
            font-size: 1.1rem !important; 
            font-weight: 700 !important;
            color: black !important;
          }
          h3, .text-lg { 
            font-size: 0.95rem !important; 
            font-weight: 700 !important;
          }
          p, span, div { font-size: 0.85rem !important; }
          .text-sm { font-size: 0.75rem !important; }
          .text-xs { font-size: 0.65rem !important; }

          /* Grid fixes for print */
          .print\\:grid-cols-3 { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
          .print\\:grid-cols-1 { display: grid !important; grid-template-columns: 1fr !important; gap: 8px !important; }
          
          /* Visual Cleanup */
          .bg-gradient-to-br, .bg-primary\\/5, .bg-muted\\/5, .bg-muted\\/30, .bg-emerald-50\\/50 { 
            background: none !important; 
            background-color: transparent !important;
            border: 1px solid #eee !important;
          }
          .shadow-sm, .shadow-xl, .shadow-inner { box-shadow: none !important; }
          .border-primary\\/10 { border-color: #eee !important; }
        }
      ` }} />
    </div>
  );
}
