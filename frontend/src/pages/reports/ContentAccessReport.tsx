import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  Users, 
  Eye, 
  BookOpen, 
  FileText,
  TrendingUp,
  Calendar,
  Activity,
  ArrowUpRight,
  Clock,
  Filter,
  MousePointer2,
  ChevronRight,
  TrendingDown,
  Layout
} from "lucide-react";
import { useAnalyticsDashboard } from "@/hooks/useAnalyticsDashboard";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function ContentAccessReport() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAnalyticsDashboard(days);

  /**
   * getInitials
   * pt-BR: Gera as iniciais para o avatar do aluno.
   */
  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  /**
   * getAvatarColor
   * pt-BR: Retorna uma cor baseada no ID ou nome para o avatar.
   */
  const getAvatarColor = (name?: string) => {
    const colors = [
      'bg-blue-500/10 text-blue-600',
      'bg-emerald-500/10 text-emerald-600',
      'bg-amber-500/10 text-amber-600',
      'bg-indigo-500/10 text-indigo-600',
      'bg-rose-500/10 text-rose-600',
      'bg-violet-500/10 text-violet-600'
    ];
    if (!name) return colors[0];
    const index = name.length % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4 animate-pulse">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Activity className="h-8 w-8 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Sincronizando Relatórios</p>
          <p className="text-xs font-bold text-muted-foreground">Isso pode levar alguns segundos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <CardContent className="p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-500 mx-auto mb-6">
            <Activity className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black tracking-tight text-red-900 mb-2">Ops! Algo deu errado.</h3>
          <p className="text-red-600/80 font-medium mb-8">Não conseguimos processar os dados do relatório neste momento.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="h-12 px-8 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/20"
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overview = data?.overview || { total_views: 0, active_users: 0 };
  const topCourses = data?.top_courses || [];
  const topActivities = data?.top_activities || [];
  const chartData = data?.views_chart || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <BarChart3 className="h-3 w-3" />
            Relatórios
            <span className="text-primary/40">•</span>
            <span className="text-primary italic">Acesso & Engajamento</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Relatório de Acesso
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Acompanhe métricas em tempo real de visualização e retenção.</p>
        </div>
        
        <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl p-2 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col mr-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">Intervado</span>
            <span className="text-xs font-black text-foreground uppercase tracking-tight">Período</span>
          </div>
          <Select 
            value={String(days)} 
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="w-40 h-10 rounded-xl border-slate-200/50 bg-white dark:bg-slate-900 shadow-sm font-bold transition-all focus:ring-4 focus:ring-primary/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 overflow-hidden">
              <SelectItem value="7" className="font-bold">Últimos 7 dias</SelectItem>
              <SelectItem value="30" className="font-bold">Últimos 30 dias</SelectItem>
              <SelectItem value="90" className="font-bold">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Total de Visualizações", label: "Acessos Brutos", value: overview.total_views, icon: Eye, color: "primary", desc: "No período selecionado" },
          { title: "Alunos Ativos", label: "Engajamento Único", value: overview.active_users, icon: Users, color: "emerald", desc: "Usuários únicos logados" },
          { title: "Média de Acessos", label: "Frequência Relativa", value: overview.active_users > 0 ? (overview.total_views / overview.active_users).toFixed(1) : 0, icon: TrendingUp, color: "indigo", desc: "Média por aluno ativo" },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden relative group hover:bg-white transition-all duration-300">
             <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
               <kpi.icon className="h-20 w-20" />
             </div>
             <CardHeader className="p-8 pb-4 relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`h-11 w-11 rounded-2xl bg-${kpi.color}-500/10 flex items-center justify-center text-${kpi.color}-600 group-hover:scale-110 transition-transform`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div className="h-6 w-full flex items-center">
                    <div className="h-0.5 w-8 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:w-full group-hover:bg-primary/20 transition-all duration-500" />
                  </div>
                </div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{kpi.title}</CardTitle>
                <CardDescription className="font-bold text-[11px] group-hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4">{kpi.label}</CardDescription>
             </CardHeader>
             <CardContent className="p-8 pt-0 relative z-10">
                <div className="text-4xl font-black tracking-tight text-foreground mb-1">{kpi.value}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">{kpi.desc}</p>
             </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Section */}
      <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden p-1">
        <CardHeader className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
                <TrendingUp className="h-3 w-3" />
                Evolution Trend
              </div>
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                Evolução de Visualizações
                <ArrowUpRight className="h-6 w-6 text-primary animate-pulse" />
              </CardTitle>
              <CardDescription className="font-bold">Acompanhamento diário de engajamento nos últimos {days} dias.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <div className="h-[350px] w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: '800', fill: '#64748B' }} 
                  dy={10}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fontWeight: '800', fill: '#64748B' }} 
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                   labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                   formatter={(value) => [value, 'Visualizações']}
                />
                <Line 
                   type="monotone" 
                   dataKey="count" 
                   stroke="#3b82f6" 
                   strokeWidth={4} 
                   dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#FFF' }}
                   activeDot={{ r: 6, stroke: '#FFF', strokeWidth: 2, fill: '#3b82f6' }} 
                   name="Visualizações" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top Courses */}
        <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="grid gap-1">
                <CardTitle className="text-xl font-black tracking-tight">Cursos Mais Acessados</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Top performers da plataforma</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topCourses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent px-4">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Identificação do Curso</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCourses.map((course, idx) => (
                    <TableRow key={course.id} className="group border-none hover:bg-white/60 transition-colors">
                      <TableCell className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{course.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-8">
                        <Badge className="h-8 rounded-xl px-4 bg-primary/10 text-primary border-none font-black flex items-center justify-center ml-auto gap-2 group-hover:bg-primary group-hover:text-white transition-all">
                          <Eye className="h-3 w-3" />
                          {course.views}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <Layout className="h-12 w-12 text-muted-foreground/20" />
                <p className="font-black uppercase tracking-widest text-muted-foreground/40 text-[10px]">Sem dados no momento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Activities */}
        <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                <Activity className="h-6 w-6" />
              </div>
              <div className="grid gap-1">
                <CardTitle className="text-xl font-black tracking-tight">Atividades Mais Vistas</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Conteúdo com maior retenção</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topActivities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent px-4">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Informação da Atividade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topActivities.map((activity) => (
                    <TableRow key={activity.id} className="group border-none hover:bg-white/60 transition-colors">
                      <TableCell className="py-4 px-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground tracking-tight group-hover:text-emerald-600 transition-colors">{activity.title}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1 mt-1">
                            <FileText className="h-3 w-3" />
                            {(activity.type || 'unknown').split('/').pop()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 px-8">
                        <Badge className="h-8 rounded-xl px-4 bg-emerald-500/10 text-emerald-600 border-none font-black flex items-center justify-center ml-auto gap-2 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          <Activity className="h-3 w-3" />
                          {activity.views}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <MousePointer2 className="h-12 w-12 text-muted-foreground/20" />
                <p className="font-black uppercase tracking-widest text-muted-foreground/40 text-[10px]">Sem visualizações registradas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

       {/* Users Last Access */}
       <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-sm">
              <Clock className="h-6 w-6" />
            </div>
            <div className="grid gap-1">
              <CardTitle className="text-xl font-black tracking-tight">Últimos Acessos dos Usuários</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Registro cronológico de interação</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.users_access && data.users_access.length > 0) ? (
            <Table>
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Identificação do Aluno</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Email de Acesso</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users_access.map((user, idx) => (
                  <TableRow key={`${user.user_id}-${idx}`} className="group border-none hover:bg-white/60 transition-colors">
                    <TableCell className="py-4 px-8">
                       <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-sm shadow-inner transition-all group-hover:scale-110 ${getAvatarColor(user.name)}`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground tracking-tight group-hover:text-indigo-600 transition-colors">{user.name}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">ID: {user.user_id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-8">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{user.email}</span>
                    </TableCell>
                    <TableCell className="text-right py-4 px-8 font-black text-xs text-foreground/80">
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className="border-indigo-100 bg-indigo-50/30 text-indigo-600 rounded-lg px-2 py-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {new Date(user.last_access).toLocaleDateString('pt-BR')}
                        </Badge>
                        <span className="text-[9px] mt-1 text-muted-foreground/60 uppercase tracking-widest">{new Date(user.last_access).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 flex flex-col items-center gap-4">
              <Users className="h-12 w-12 text-muted-foreground/20" />
              <p className="font-black uppercase tracking-widest text-muted-foreground/40 text-[10px]">Nenhum acesso registrado no período</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
