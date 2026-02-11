import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Eye, 
  BookOpen, 
  FileText,
  TrendingUp,
  Calendar,
  Activity
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Carregando relatório de acesso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">Erro ao carregar dados do relatório.</p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overview = data?.overview || { total_views: 0, active_users: 0 };
  const topCourses = data?.top_courses || [];
  const topActivities = data?.top_activities || [];
  const chartData = data?.views_chart || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Acesso</h1>
          <p className="text-muted-foreground">
            Acompanhe o engajamento dos alunos com os conteúdos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Período:</label>
          <select 
            className="border rounded-md px-2 py-1 text-sm bg-background"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-sidebar-foreground">Total de Visualizações</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_views}</div>
            <p className="text-xs text-muted-foreground">Acessos no período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-sidebar-foreground">Alunos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.active_users}</div>
            <p className="text-xs text-muted-foreground">Usuários únicos que acessaram conteúdo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-sidebar-foreground">Média de Acessos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.active_users > 0 ? (overview.total_views / overview.active_users).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Visualizações por aluno ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sidebar-foreground">Evolução de Visualizações</CardTitle>
          <CardDescription>Visualizações diárias de cursos e atividades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                  formatter={(value) => [value, 'Visualizações']}
                />
                <Legend />
                <Line 
                   type="monotone" 
                   dataKey="count" 
                   stroke="#3b82f6" 
                   strokeWidth={3} 
                   dot={{ r: 4 }} 
                   activeDot={{ r: 6 }} 
                   name="Visualizações" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Courses */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <div className="grid gap-1">
              <CardTitle className="text-sidebar-foreground">Cursos Mais Acessados</CardTitle>
              <CardDescription>Cursos com maior volume de visualização</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {topCourses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead className="text-right">Acessos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{course.views}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>

        {/* Top Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div className="grid gap-1">
              <CardTitle className="text-sidebar-foreground">Atividades Mais Vistas</CardTitle>
              <CardDescription>Lições, questionários ou arquivos mais populares</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {topActivities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Acessos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {activity.type.split('/').pop()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{activity.views}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">Nenhum dado disponível</div>
            )}
          </CardContent>

        </Card>
      </div>

       {/* Users Last Access */}
       <Card className="mt-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div className="grid gap-1">
            <CardTitle className="text-sidebar-foreground">Últimos Acessos dos Usuários</CardTitle>
            <CardDescription>Lista de usuários que acessaram recentemente</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {(data?.users_access && data.users_access.length > 0) ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Último Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users_access.map((user, idx) => (
                  <TableRow key={`${user.user_id}-${idx}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-right">
                      {new Date(user.last_access).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">Nenhum acesso registrado no período</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
