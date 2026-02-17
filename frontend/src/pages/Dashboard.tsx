import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { coursesService } from "@/services/coursesService";
import { dashboardChartsService } from "@/services/dashboardChartsService";
import { useEnrollmentsList } from "@/hooks/enrollments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  CalendarRange, 
  Library, 
  Filter, 
  ChevronRight, 
  Sparkles,
  MousePointer2,
  FileText,
  Clock,
  ArrowUpRight
} from "lucide-react";

/**
 * Dashboard
 * pt-BR: Página principal modernizada com KPI cards premium e visual SaaS 3.0.
 * en-US: Modernized main dashboard with premium KPI cards and SaaS 3.0 visuals.
 */
export default function Dashboard() {
  const navigate = useNavigate();

  /**
   * KpiCardLink
   * pt-BR: Componente auxiliar para tornar um Card inteiro clicável (Premium).
   * en-US: Helper component to make a whole Card clickable (Premium).
   */
  function KpiCardLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
      <Link
        to={to}
        className="block focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-3xl transition-all active:scale-95 group"
        aria-label="Abrir seção"
      >
        <div className="h-full transition-all duration-300">
          {children}
        </div>
      </Link>
    );
  }

  const coursesTotalQuery = useQuery({
    queryKey: ["courses", "count"],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeEnrollResp } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "mat" } as any);
  const { data: interestEnrollResp } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "int" } as any);

  const totalCursos = (coursesTotalQuery.data as any)?.total || 0;
  const totalAlunos = (activeEnrollResp as any)?.total || 0;
  const totalInteressados = (interestEnrollResp as any)?.total || 0;

  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const comparisonYear = selectedYear - 1;
  const keyCurr = `y${selectedYear}`;
  const keyPrev = `y${comparisonYear}`;

  const initialSeries = months.map((m) => ({ mes: m, [keyPrev]: 0, [keyCurr]: 0 } as any));
  const [interestedMonthlyData, setInterestedMonthlyData] = useState<Array<{ mes: string; [key: string]: number }>>(initialSeries);
  const [enrolledMonthlyData, setEnrolledMonthlyData] = useState<Array<{ mes: string; [key: string]: number }>>(initialSeries);

  const dashboardSummaryQuery = useQuery({
    queryKey: ["dashboard", "summary", selectedYear],
    queryFn: () => dashboardChartsService.getSummary({ year: selectedYear }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const charts = dashboardSummaryQuery.data?.data?.charts as any;
    if (charts?.interested && Array.isArray(charts.interested)) {
      setInterestedMonthlyData(charts.interested);
    }
    if (charts?.enrolled && Array.isArray(charts.enrolled)) {
      setEnrolledMonthlyData(charts.enrolled);
    }
  }, [dashboardSummaryQuery.data]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <LayoutDashboard className="h-3 w-3" />
            Escola
            <span className="text-primary/40">•</span>
            <span className="text-primary italic">Visão Geral</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            Dashboard
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Bem-vindo ao centro de comando da sua escola EAD.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 font-bold px-6 hover:bg-slate-50 transition-all gap-2">
            <Link to="/admin/reports/content-access">
              <FileText className="h-4 w-4 text-primary" />
              Relatório de Acesso
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">Período de Análise</p>
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Filtros Operacionais</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 ml-2">Ano</Label>
            <Select 
              value={String(selectedYear)} 
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
            >
              <SelectTrigger className="w-32 h-10 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const y = new Date().getFullYear() - idx;
                  return (
                    <SelectItem key={y} value={String(y)} className="font-bold">{y}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {dashboardSummaryQuery.isFetching && (
              <div className="flex items-center gap-2 pr-4 pl-2 border-l border-slate-200 dark:border-slate-700 ml-2">
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Sincronizando</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total de Interessados", desc: "Pré-cadastros registrados", value: totalInteressados, to: "/admin/school/interested", icon: Users, color: "primary" },
          { title: "Total de Alunos", desc: "Matrículas em dia", value: totalAlunos, to: "/admin/school/enroll", icon: UserCheck, color: "emerald" },
          { title: "Agendados", desc: "Resumo operacional", value: "0", to: "/admin/school/classes", icon: CalendarRange, color: "amber" },
          { title: "Cursos Ativos", desc: "Conteúdo publicado", value: totalCursos, to: "/admin/school/courses", icon: Library, color: "blue" },
        ].map((kpi, i) => (
          <KpiCardLink key={i} to={kpi.to}>
            <Card className="h-full border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl group-hover:bg-white transition-all rounded-3xl overflow-hidden relative">
              <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
                <kpi.icon className="h-24 w-24" />
              </div>
              <CardHeader className="p-8 pb-4 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-2xl bg-${kpi.color}-500/10 flex items-center justify-center text-${kpi.color}-600 group-hover:scale-110 transition-transform`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div className="h-6 w-full flex items-center">
                    <div className="h-0.5 w-8 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:w-full group-hover:bg-primary/20 transition-all duration-500" />
                  </div>
                </div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{kpi.title}</CardTitle>
                <CardDescription className="font-bold text-[11px] group-hover:text-primary transition-colors">{kpi.desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex items-end justify-between relative z-10">
                <div className="text-4xl font-black tracking-tight text-foreground">{kpi.value}</div>
                <div className="h-8 w-8 rounded-full border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </KpiCardLink>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-4">
          <MousePointer2 className="h-4 w-4 text-primary animate-bounce-slow" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acesso Rápido</span>
        </div>
        {[
          { label: "Clientes", to: "/admin/clients", variant: "default", icon: Users },
          { label: "Todos Cursos", to: "/admin/school/courses", variant: "secondary", icon: Library },
          { label: "Matrículas", to: "/admin/school/enroll", variant: "outline", icon: UserCheck },
          { label: "Relatórios", to: "/admin/reports/content-access", variant: "ghost", icon: FileText },
        ].map((action, i) => (
          <Button key={i} asChild variant={action.variant as any} className={`h-11 rounded-xl font-bold px-6 transition-all hover:scale-105 active:scale-95 gap-2 ${action.variant === 'outline' ? 'border-slate-200' : ''}`}>
            <Link to={action.to}>
              <action.icon className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        {[
          { title: "Interessados", data: interestedMonthlyData, color: "#3b82f6", label: "Comparativo de Leads" },
          { title: "Matriculados", data: enrolledMonthlyData, color: "#10b981", label: "Evolução de Alunos" }
        ].map((chart, i) => (
          <Card key={i} className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden p-1">
            <CardHeader className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
                    <Clock className="h-3 w-3" />
                    Trend Analysis
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    {chart.title} do ano de {selectedYear}
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                  </CardTitle>
                  <CardDescription className="font-bold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-900" /> {selectedYear} 
                    <span className="text-slate-300 mx-1">vs</span> 
                    <span className="h-2 w-2 rounded-full bg-primary" /> {comparisonYear}
                  </CardDescription>
                </div>
                {dashboardSummaryQuery.isFetching && (
                   <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest px-3">Syncing</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <div className="h-[320px] w-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart.data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: '800', fill: '#64748B' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: '800', fill: '#64748B' }} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle" 
                      wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey={keyCurr} 
                      stroke="#0F172A" 
                      strokeWidth={4} 
                      dot={false}
                      activeDot={{ r: 6, stroke: '#FFF', strokeWidth: 2, fill: '#0F172A' }} 
                      name={`${chart.title} ${selectedYear}`} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey={keyPrev} 
                      stroke={chart.color} 
                      strokeWidth={4} 
                      dot={false}
                      activeDot={{ r: 6, stroke: '#FFF', strokeWidth: 2, fill: chart.color }} 
                      name={`${chart.title} ${comparisonYear}`} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
