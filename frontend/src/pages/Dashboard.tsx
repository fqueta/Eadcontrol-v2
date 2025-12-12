import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { coursesService } from "@/services/coursesService";
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
  const interestedMonthlyData = useMemo(
    () => [
      { mes: months[0], y2024: 5, y2025: 8 },
      { mes: months[1], y2024: 3, y2025: 5 },
      { mes: months[2], y2024: 6, y2025: 7 },
      { mes: months[3], y2024: 4, y2025: 6 },
      { mes: months[4], y2024: 7, y2025: 5 },
      { mes: months[5], y2024: 5, y2025: 6 },
      { mes: months[6], y2024: 6, y2025: 7 },
      { mes: months[7], y2024: 8, y2025: 9 },
      { mes: months[8], y2024: 7, y2025: 6 },
      { mes: months[9], y2024: 5, y2025: 7 },
      { mes: months[10], y2024: 6, y2025: 8 },
      { mes: months[11], y2024: 7, y2025: 9 },
    ],
    []
  );
  const enrolledMonthlyData = useMemo(
    () => [
      { mes: months[0], y2024: 4, y2025: 6 },
      { mes: months[1], y2024: 2, y2025: 3 },
      { mes: months[2], y2024: 3, y2025: 4 },
      { mes: months[3], y2024: 4, y2025: 5 },
      { mes: months[4], y2024: 3, y2025: 4 },
      { mes: months[5], y2024: 2, y2025: 3 },
      { mes: months[6], y2024: 3, y2025: 4 },
      { mes: months[7], y2024: 5, y2025: 8 },
      { mes: months[8], y2024: 4, y2025: 5 },
      { mes: months[9], y2024: 3, y2025: 4 },
      { mes: months[10], y2024: 4, y2025: 5 },
      { mes: months[11], y2024: 6, y2025: 11 },
    ],
    []
  );

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

      {/* Cards KPI no topo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Interessados</CardTitle>
            <CardDescription>Pré-cadastros (int)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInteressados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <CardDescription>Matrículas ativas (mat)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAlunos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <CardDescription>Resumo operacional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
            <CardDescription>Total cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCursos}</div>
          </CardContent>
        </Card>
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
            <CardTitle>Interessados do ano de 2025</CardTitle>
            <CardDescription>Comparativo 2024 x 2025</CardDescription>
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
                  <Line type="monotone" dataKey="y2025" stroke="#111827" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Interessados 2025" />
                  <Line type="monotone" dataKey="y2024" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Interessados 2024" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matriculados do ano de 2025</CardTitle>
            <CardDescription>Comparativo 2024 x 2025</CardDescription>
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
                  <Line type="monotone" dataKey="y2025" stroke="#111827" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Matriculados 2025" />
                  <Line type="monotone" dataKey="y2024" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Matriculados 2024" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}