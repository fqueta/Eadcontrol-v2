import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { coursesService } from "@/services/coursesService";
import { useEnrollmentsList } from "@/hooks/enrollments";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/**
 * AeroclubeDashboard
 * pt-BR: Dashboard com dados mockados inspirados na imagem fornecida.
 * Exibe gráficos de vendas/horas por mês, proporções (pizza),
 * evolução de metas e um registro de acessos.
 *
 * en-US: Dashboard using mocked data inspired by the provided screenshot.
 * Shows monthly sales/hours, pie proportions, goal trends and an access log.
 */
export default function AeroclubeDashboard() {
  /**
   * EAD Dashboard Hooks
   * pt-BR: KPIs e lista recente de matrículas.
   * en-US: KPIs and recent enrollments list.
   */
  const navigate = useNavigate();

  // Cursos: obter total via listagem mínima
  const coursesTotalQuery = useQuery({
    queryKey: ["courses", "count"],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  // Matrículas: totais por situação
  const { data: activeEnrollResp, isLoading: activeEnrollLoading } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "mat" } as any);
  const { data: interestEnrollResp, isLoading: interestEnrollLoading } = useEnrollmentsList({ page: 1, per_page: 1, situacao: "int" } as any);

  // Matrículas recentes
  const { data: recentEnrollResp, isLoading: recentEnrollLoading } = useEnrollmentsList({ page: 1, per_page: 5, situacao: "mat" } as any);

  const enrollmentsList = useMemo(() => {
    const arr = (recentEnrollResp as any)?.data || (recentEnrollResp as any)?.items || [];
    return Array.isArray(arr) ? arr : [];
  }, [recentEnrollResp]);
  /**
   * Estado de UI: ano selecionado para gráficos principais
   */
  const [selectedYear, setSelectedYear] = useState<"2024" | "2025">("2025");
  /**
   * Mock: meses com valores de vendas, horas vendidas e meta do mês
   */
  const monthly2024 = useMemo(
    () => [
      { month: "JAN", value: 13500, hours: 85, meta: 12000 },
      { month: "FEV", value: 9800, hours: 72, meta: 12000 },
      { month: "MAR", value: 11200, hours: 76, meta: 12000 },
      { month: "ABR", value: 12550, hours: 81, meta: 12000 },
      { month: "MAI", value: 10120, hours: 70, meta: 12000 },
      { month: "JUN", value: 9400, hours: 66, meta: 12000 },
      { month: "JUL", value: 8900, hours: 64, meta: 12000 },
      { month: "AGO", value: 15400, hours: 102, meta: 12000 },
      { month: "SET", value: 11800, hours: 78, meta: 12000 },
      { month: "OUT", value: 13200, hours: 84, meta: 12000 },
      { month: "NOV", value: 12700, hours: 82, meta: 12000 },
      { month: "DEZ", value: 14500, hours: 96, meta: 12000 },
    ],
    []
  );

  /**
   * Mock para 2025 – valores ligeiramente diferentes para comparação
   */
  const monthly2025 = useMemo(
    () => [
      { month: "JAN", value: 14200, hours: 90, meta: 14000 },
      { month: "FEV", value: 10500, hours: 74, meta: 14000 },
      { month: "MAR", value: 12100, hours: 80, meta: 14000 },
      { month: "ABR", value: 12950, hours: 83, meta: 14000 },
      { month: "MAI", value: 11320, hours: 76, meta: 14000 },
      { month: "JUN", value: 9900, hours: 68, meta: 14000 },
      { month: "JUL", value: 9400, hours: 66, meta: 14000 },
      { month: "AGO", value: 16000, hours: 104, meta: 14000 },
      { month: "SET", value: 12050, hours: 80, meta: 14000 },
      { month: "OUT", value: 13800, hours: 86, meta: 14000 },
      { month: "NOV", value: 13000, hours: 84, meta: 14000 },
      { month: "DEZ", value: 15200, hours: 98, meta: 14000 },
    ],
    []
  );

  /**
   * Mock: série histórica de horas voadas por ano (valores genéricos)
   */
  const hoursHistory = useMemo(
    () => [
      { label: "JAN", y2020: 60, y2021: 72, y2022: 80, y2023: 75, y2024: 85, y2025: 90 },
      { label: "FEV", y2020: 58, y2021: 68, y2022: 78, y2023: 70, y2024: 72, y2025: 74 },
      { label: "MAR", y2020: 64, y2021: 70, y2022: 82, y2023: 73, y2024: 76, y2025: 80 },
      { label: "ABR", y2020: 66, y2021: 71, y2022: 84, y2023: 76, y2024: 81, y2025: 83 },
      { label: "MAI", y2020: 63, y2021: 69, y2022: 79, y2023: 71, y2024: 70, y2025: 76 },
      { label: "JUN", y2020: 57, y2021: 66, y2022: 75, y2023: 68, y2024: 66, y2025: 68 },
      { label: "JUL", y2020: 55, y2021: 64, y2022: 74, y2023: 66, y2024: 64, y2025: 66 },
      { label: "AGO", y2020: 70, y2021: 85, y2022: 95, y2023: 90, y2024: 102, y2025: 104 },
      { label: "SET", y2020: 60, y2021: 72, y2022: 80, y2023: 75, y2024: 78, y2025: 80 },
      { label: "OUT", y2020: 62, y2021: 74, y2022: 82, y2023: 78, y2024: 84, y2025: 86 },
      { label: "NOV", y2020: 61, y2021: 73, y2022: 81, y2023: 77, y2024: 82, y2025: 84 },
      { label: "DEZ", y2020: 68, y2021: 80, y2022: 90, y2023: 85, y2024: 96, y2025: 98 },
    ],
    []
  );

  /**
   * Mock: registro de acessos similar à tabela da imagem
   */
  const accessLog = useMemo(
    () => [
      { id: 23031, date: "13/11/2025", time: "13:11:16", name: "Usuário demo", ip: "172.78.18.66" },
      { id: 23030, date: "13/11/2025", time: "12:41:08", name: "Gabriela Fernandes", ip: "172.70.29.93" },
      { id: 23029, date: "13/11/2025", time: "11:55:42", name: "Monique Ribeiro", ip: "172.70.142.70" },
      { id: 23028, date: "13/11/2025", time: "11:41:05", name: "Usuario demo", ip: "172.70.114.45" },
      { id: 23027, date: "12/11/2025", time: "14:13:54", name: "Maria Luíza da Silva Sanches", ip: "172.70.114.45" },
      { id: 23026, date: "12/11/2025", time: "13:41:18", name: "Jessia Fakhri", ip: "172.70.140.130" },
      { id: 23025, date: "12/11/2025", time: "12:31:52", name: "Leandro Lopardi", ip: "172.70.143.80" },
      { id: 23024, date: "12/11/2025", time: "11:41:22", name: "Leandro Lopardi", ip: "172.70.143.80" },
    ],
    []
  );

  /**
   * Helpers para somatórios usados nas pizzas
   */
  const totals2024 = useMemo(() => ({
    value: monthly2024.reduce((acc, m) => acc + m.value, 0),
    hours: monthly2024.reduce((acc, m) => acc + m.hours, 0),
  }), [monthly2024]);
  const totals2025 = useMemo(() => ({
    value: monthly2025.reduce((acc, m) => acc + m.value, 0),
    hours: monthly2025.reduce((acc, m) => acc + m.hours, 0),
  }), [monthly2025]);

  const pieColors = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"]; // verde, vermelho, azul, amarelo

  /**
   * Derivados: dataset ativo conforme ano selecionado
   */
  const activeMonthly = selectedYear === "2024" ? monthly2024 : monthly2025;
  const activeTotals = selectedYear === "2024" ? totals2024 : totals2025;
  const compareTotals = selectedYear === "2024" ? totals2025 : totals2024;
  const variation = activeTotals.value - compareTotals.value;

  return (
    <div className="space-y-6">
      {/* Hero/Header moderno com branding */}
      <Card className="overflow-hidden border-none shadow-none">
        <div className="relative rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-6 text-white">
          <div className="flex items-center gap-4">
            {/* Logo: tenta usar /aeroclube-logo.svg e cai para /placeholder.svg se não existir */}
            <img
              src="/aeroclube-logo.svg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              alt="Aeroclube logo"
              className="h-12 w-auto drop-shadow"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Painel do Aeroclube</h1>
              <p className="text-sm md:text-base/relaxed opacity-90">Visão moderna com dados mockados — integração futura com sua API</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge className="bg-white/20 text-white hover:bg-white/30">Preview</Badge>
            <Badge className="bg-black/20 text-white hover:bg-black/30">Mock Data</Badge>
          </div>
        </div>
      </Card>

      {/* KPIs EAD */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(coursesTotalQuery.data as any)?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matrículas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(activeEnrollResp as any)?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Situação: ativa (mat)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interessados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(interestEnrollResp as any)?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Em pré-cadastro (int)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atalhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild>
                <Link to="/admin/school/courses">Cursos</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/school/enroll">Matrículas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matrículas Recentes */}
      <Card className="mt-2">
        <CardHeader>
          <CardTitle>Matrículas recentes</CardTitle>
          <CardDescription>Últimas entradas na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEnrollLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : enrollmentsList.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma matrícula recente</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollmentsList.map((enroll: any) => {
                  const studentName = String(
                    enroll?.cliente_nome || enroll?.student_name || enroll?.aluno_nome || enroll?.cliente || enroll?.aluno || "-"
                  );
                  const courseName = String(
                    enroll?.curso_nome || enroll?.course_name || (enroll?.curso ? (enroll?.curso?.nome || enroll?.curso?.titulo) : "") || "-"
                  );
                  const status = String(enroll?.situacao || enroll?.status || "mat");
                  const id = String(enroll?.id || "");
                  return (
                    <TableRow key={id}>
                      <TableCell>{studentName}</TableCell>
                      <TableCell>{courseName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/admin/school/enrollments/${id}/progress`)}>
                          Acompanhar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Toolbar: seleção de ano e KPIs resumidos */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={selectedYear === "2024" ? "default" : "outline"}
              onClick={() => setSelectedYear("2024")}
            >2024</Button>
            <Button
              variant={selectedYear === "2025" ? "default" : "outline"}
              onClick={() => setSelectedYear("2025")}
            >2025</Button>
          </div>
          <div className="text-sm text-muted-foreground">Totais do ano selecionado</div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Valor total ({selectedYear})</CardTitle>
              <CardDescription>Somatório anual em reais</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold">R$ {activeTotals.value.toLocaleString()}</div>
              <div className="mt-1 flex items-center text-xs text-muted-foreground">
                {variation >= 0 ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-600" />
                )}
                {variation >= 0 ? "acima" : "abaixo"} de {selectedYear === "2024" ? "2025" : "2024"} por R$ {Math.abs(variation).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Horas totais ({selectedYear})</CardTitle>
              <CardDescription>Somatório anual de horas</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold">{activeTotals.hours.toLocaleString()} h</div>
              <div className="mt-1 text-xs text-muted-foreground">Meta média mensal acompanhada nos gráficos</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Valor total (2024)</CardTitle>
              <CardDescription>Comparativo rápido</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold">R$ {totals2024.value.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted-foreground">Horas {totals2024.hours.toLocaleString()} h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Valor total (2025)</CardTitle>
              <CardDescription>Comparativo rápido</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold">R$ {totals2025.value.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted-foreground">Horas {totals2025.hours.toLocaleString()} h</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Linha superior com 2 gráficos (2024/2025) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas do ano de 2024</CardTitle>
            <CardDescription>Valores e horas vendidas por mês</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly2024}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Valor (R$)" fill="#3b82f6" />
                <Bar dataKey="hours" name="Horas" fill="#ef4444" />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#22c55e" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas do ano de 2025</CardTitle>
            <CardDescription>Comparativo de valores/horas e metas</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly2025}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Valor (R$)" fill="#3b82f6" />
                <Bar dataKey="hours" name="Horas" fill="#ef4444" />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#22c55e" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Linha de pizzas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Proporção de valores — 2024 x 2025</CardTitle>
            <CardDescription>Total anual</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={[
                  { name: "2024", value: totals2024.value },
                  { name: "2025", value: totals2025.value },
                ]} cx="50%" cy="50%" outerRadius={100} label>
                  {[0,1].map((i) => (
                    <Cell key={`c-${i}`} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proporção de horas — 2024 x 2025</CardTitle>
            <CardDescription>Total anual</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={[
                  { name: "2024", value: totals2024.hours },
                  { name: "2025", value: totals2025.hours },
                ]} cx="50%" cy="50%" outerRadius={100} label>
                  {[0,1].map((i) => (
                    <Cell key={`c-h-${i}`} fill={pieColors[i+2]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas do ano de 2025</CardTitle>
            <CardDescription>Evolução mensal</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeMonthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name="Valor (R$)" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Registro de acessos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registro de acessos</CardTitle>
            <CardDescription>Últimos eventos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Id</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessLog.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.time}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de horas por ano */}
        <Card>
          <CardHeader>
            <CardTitle>Horas voadas — 2020 a 2025</CardTitle>
            <CardDescription>Comparativo mensal</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hoursHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="y2020" name="2020" stroke="#64748b" />
                <Line type="monotone" dataKey="y2021" name="2021" stroke="#a855f7" />
                <Line type="monotone" dataKey="y2022" name="2022" stroke="#06b6d4" />
                <Line type="monotone" dataKey="y2023" name="2023" stroke="#f59e0b" />
                <Line type="monotone" dataKey="y2024" name="2024" stroke="#ef4444" />
                <Line type="monotone" dataKey="y2025" name="2025" stroke="#22c55e" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}