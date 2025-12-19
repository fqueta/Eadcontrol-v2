import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { coursesService } from "@/services/coursesService";
import { dashboardChartsService } from "@/services/dashboardChartsService";
import { useEnrollmentsList } from "@/hooks/enrollments";
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

/**
 * Dashboard
 * pt-BR: Página principal simplificada com cards de KPI (Interessados, Alunos e Cursos)
 *        e atalhos rápidos, seguindo o estilo visual do exemplo compartilhado.
 * en-US: Simplified main dashboard with KPI cards (Leads, Students, Courses)
 *        and quick actions, matching the shared visual style.
 */
export default function Dashboard() {
  const navigate = useNavigate();

  /**
   * KpiCardLink
   * pt-BR: Componente auxiliar para tornar um Card inteiro clicável, navegando
   *        para a rota especificada via `Link`.
   * en-US: Helper component to make a whole Card clickable, navigating to the
   *        specified route using `Link`.
   */
  function KpiCardLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
      <Link
        to={to}
        className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
        aria-label="Abrir seção relacionada ao indicador"
      >
        {/*
         * pt-BR: Usamos classes utilitárias para indicar interatividade do Card.
         * en-US: Utility classes hint the Card is interactive.
         */}
        <div className="hover:shadow-md transition-shadow cursor-pointer">
          {children}
        </div>
      </Link>
    );
  }

  /**
   * pt-BR: Consulta rápida para obter o total de cursos.
   * en-US: Quick query to get total number of courses.
   */
  const coursesTotalQuery = useQuery({
    queryKey: ["courses", "count"],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * pt-BR: Totais de matrículas por situação: "mat" (ativas) e "int" (interessados).
   * en-US: Enrollment totals by situation: "mat" (active) and "int" (leads).
   */
  const { data: activeEnrollResp } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "mat" } as any);
  const { data: interestEnrollResp } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "int" } as any);

  const totalCursos = (coursesTotalQuery.data as any)?.total || 0;
  const totalAlunos = (activeEnrollResp as any)?.total || 0;
  const totalInteressados = (interestEnrollResp as any)?.total || 0;

  /**
   * pt-BR: Dados mockados para gráficos anuais (2024/2025) de interessados e matriculados.
   * en-US: Mocked yearly data (2024/2025) for leads and enrolled charts.
   */
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  /**
   * Filtro de ano
   * pt-BR: Ano selecionado pelo painel; comparativo é o ano anterior.
   * en-US: Selected year from filter; comparison is previous year.
   */
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const comparisonYear = selectedYear - 1;
  const keyCurr = `y${selectedYear}`;
  const keyPrev = `y${comparisonYear}`;

  // Estados iniciais baseados no ano selecionado
  const initialSeries = months.map((m) => ({ mes: m, [keyPrev]: 0, [keyCurr]: 0 } as any));
  const [interestedMonthlyData, setInterestedMonthlyData] = useState<Array<{ mes: string; [key: string]: number }>>(initialSeries);
  const [enrolledMonthlyData, setEnrolledMonthlyData] = useState<Array<{ mes: string; [key: string]: number }>>(initialSeries);
  /**
   * dashboardSummaryQuery
   * pt-BR: Consulta React Query para obter o resumo consolidado do Dashboard.
   *        Atualiza os estados dos gráficos ao receber os dados.
   * en-US: React Query to fetch consolidated Dashboard summary.
   *        Updates chart states when data arrives.
   */
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da escola EAD</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700">Resumo</Badge>
          <Badge className="bg-gray-100 text-gray-700">KPI</Badge>
        </div>
      </div>

      {/* Painel de Filtros */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Filtros</CardTitle>
          <CardDescription>Selecione o período para os gráficos</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-muted-foreground" htmlFor="year-select">Ano</label>
            <select
              id="year-select"
              className="border rounded-md px-2 py-1 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              aria-label="Selecionar ano"
            >
              {Array.from({ length: 6 }).map((_, idx) => {
                const y = new Date().getFullYear() - idx;
                return (
                  <option key={y} value={y}>{y}</option>
                );
              })}
            </select>
            {dashboardSummaryQuery.isFetching && (
              <span className="text-xs text-muted-foreground">Atualizando dados…</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards KPI no topo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCardLink to="/admin/school/interested">
          <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Interessados</CardTitle>
            <CardDescription>Pré-cadastros (int)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInteressados}</div>
          </CardContent>
          </Card>
        </KpiCardLink>

        <KpiCardLink to="/admin/school/enroll">
          <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <CardDescription>Matrículas ativas (mat)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAlunos}</div>
          </CardContent>
          </Card>
        </KpiCardLink>

        <KpiCardLink to="/admin/school/classes">
          <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <CardDescription>Resumo operacional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
          </Card>
        </KpiCardLink>

        <KpiCardLink to="/admin/school/courses">
          <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
            <CardDescription>Total cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCursos}</div>
          </CardContent>
          </Card>
        </KpiCardLink>
      </div>

      {/* Atalhos rápidos como na imagem */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/admin/clients">Cliente</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/admin/school/courses">Todos Cursos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/school/enroll">Curso</Link>
        </Button>
      </div>

      {/* Gráficos de retas: Interessados e Matriculados */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Interessados do ano de {selectedYear}</CardTitle>
            <CardDescription>
              Comparativo {comparisonYear} x {selectedYear}
              {dashboardSummaryQuery.isFetching && (
                <span className="ml-2 text-xs">(Atualizando)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={interestedMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={keyCurr} stroke="#111827" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name={`Interessados ${selectedYear}`} />
                  <Line type="monotone" dataKey={keyPrev} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name={`Interessados ${comparisonYear}`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matriculados do ano de {selectedYear}</CardTitle>
            <CardDescription>
              Comparativo {comparisonYear} x {selectedYear}
              {dashboardSummaryQuery.isFetching && (
                <span className="ml-2 text-xs">(Atualizando)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enrolledMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={keyCurr} stroke="#111827" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name={`Matriculados ${selectedYear}`} />
                  <Line type="monotone" dataKey={keyPrev} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name={`Matriculados ${comparisonYear}`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}