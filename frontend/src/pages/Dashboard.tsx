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

export default function Dashboard() {
  const navigate = useNavigate();

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
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 font-bold px-4 text-xs hover:bg-slate-50">
            <Link to="/admin/reports/content-access">
              <FileText className="h-3.5 w-3.5 text-primary mr-1.5" />
              Relatório de Acesso
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Filter className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-tight">Filtros Operacionais</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-800/70 p-1 px-2 rounded-lg border border-slate-200/50">
            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Ano</Label>
            <Select 
              value={String(selectedYear)} 
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
            >
              <SelectTrigger className="w-28 h-8 rounded-md border-none bg-white dark:bg-slate-900 shadow-xs font-bold text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const y = new Date().getFullYear() - idx;
                  return (
                    <SelectItem key={y} value={String(y)} className="font-bold text-xs">{y}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {dashboardSummaryQuery.isFetching && (
              <div className="flex items-center gap-1.5 pr-2 pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
                <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">Sync</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total de Interessados", desc: "Pré-cadastros", value: totalInteressados, to: "/admin/school/interested", icon: Users, color: "primary", bg: "bg-primary/10", textColor: "text-primary" },
          { title: "Total de Alunos", desc: "Matrículas ativas", value: totalAlunos, to: "/admin/school/enroll", icon: UserCheck, color: "emerald", bg: "bg-emerald-500/10", textColor: "text-emerald-600" },
          { title: "Agendados", desc: "Operacional", value: "0", to: "/admin/school/classes", icon: CalendarRange, color: "amber", bg: "bg-amber-500/10", textColor: "text-amber-600" },
          { title: "Cursos Ativos", desc: "Publicados", value: totalCursos, to: "/admin/school/courses", icon: Library, color: "blue", bg: "bg-blue-500/10", textColor: "text-blue-600" },
        ].map((kpi, i) => (
          <KpiCardLink key={i} to={kpi.to}>
            <Card className="h-full border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl p-3.5 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${kpi.bg} ${kpi.textColor} flex items-center justify-center shrink-0`}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{kpi.title}</p>
                    <div className="text-xl font-black tracking-tight text-foreground leading-none mt-0.5">{kpi.value}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </KpiCardLink>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="flex items-center gap-1.5 mr-2">
          <MousePointer2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acesso Rápido</span>
        </div>
        {[
          { label: "Clientes", to: "/admin/clients", variant: "default", icon: Users },
          { label: "Todos Cursos", to: "/admin/school/courses", variant: "secondary", icon: Library },
          { label: "Matrículas", to: "/admin/school/enroll", variant: "outline", icon: UserCheck },
          { label: "Relatórios", to: "/admin/reports/content-access", variant: "ghost", icon: FileText },
        ].map((action, i) => (
          <Button key={i} asChild variant={action.variant as any} size="sm" className="h-8 rounded-lg font-bold text-xs px-3 gap-1.5 border-slate-200">
            <Link to={action.to}>
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2 pt-1">
        {[
          { title: "Interessados", data: interestedMonthlyData, color: "#3b82f6" },
          { title: "Matriculados", data: enrolledMonthlyData, color: "#10b981" }
        ].map((chart, i) => (
          <Card key={i} className="border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden p-1">
            <CardHeader className="px-4 py-3 pb-1">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-black tracking-tight flex items-center gap-1.5">
                    {chart.title} ({selectedYear})
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </CardTitle>
                  <CardDescription className="text-[11px] font-bold">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-900 mr-1" /> {selectedYear} 
                    <span className="text-slate-400 mx-1">vs</span> 
                    <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1" /> {comparisonYear}
                  </CardDescription>
                </div>
                {dashboardSummaryQuery.isFetching && (
                   <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20 font-bold text-[9px] uppercase px-2 py-0.5">Syncing</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[210px] w-full pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart.data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: '800', fill: '#64748B' }} 
                      dy={5}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: '800', fill: '#64748B' }} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '11px' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle" 
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey={keyCurr} 
                      stroke="#0F172A" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 5, stroke: '#FFF', strokeWidth: 2, fill: '#0F172A' }} 
                      name={`${chart.title} ${selectedYear}`} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey={keyPrev} 
                      stroke={chart.color} 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 5, stroke: '#FFF', strokeWidth: 2, fill: chart.color }} 
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
