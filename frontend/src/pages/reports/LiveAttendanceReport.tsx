import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Search, Download } from 'lucide-react';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { liveSessionsService } from '@/services/liveSessionsService';
import { Input } from '@/components/ui/input';

export default function LiveAttendanceReport() {
  const [selectedCurso, setSelectedCurso] = useState<string>('');
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [search, setSearch] = useState('');

  const coursesQuery = useQuery({
    queryKey: ['courses', 'select'],
    queryFn: async () => {
      const res = await coursesService.list();
      return Array.isArray(res.data) ? res.data : ((res as any).items || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const turmasQuery = useQuery({
    queryKey: ['turmas', 'select', selectedCurso],
    queryFn: async () => {
      const res = await turmasService.list({ id_curso: selectedCurso, per_page: 200 });
      return Array.isArray(res.data) ? res.data : ((res as any).items || []);
    },
    enabled: !!selectedCurso,
  });

  const reportQuery = useQuery({
    queryKey: ['attendance-report', selectedCurso, selectedTurma],
    queryFn: async () => {
      const res = await liveSessionsService.customGet<any>('/reports/attendance', {
        id_curso: selectedCurso,
        id_turma: selectedTurma,
      });
      return res;
    },
    enabled: !!selectedCurso && !!selectedTurma,
  });

  const coursesOptions = useMemo(() => {
    return (coursesQuery.data || []).map((c: any) => ({
      id: String(c.id),
      nome: c.nome,
    }));
  }, [coursesQuery.data]);

  const turmasOptions = useMemo(() => {
    return (turmasQuery.data || []).map((t: any) => ({
      id: String(t.id),
      nome: t.nome,
    }));
  }, [turmasQuery.data]);

  const reportData = reportQuery.data;
  const alunos = reportData?.alunos || [];

  const filteredAlunos = useMemo(() => {
    if (!search.trim()) return alunos;
    const lower = search.toLowerCase();
    return alunos.filter((a: any) => 
      a.nome.toLowerCase().includes(lower) || 
      a.email.toLowerCase().includes(lower)
    );
  }, [alunos, search]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 print:p-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Relatório de Frequência ao Vivo
          </h2>
          <p className="text-muted-foreground mt-1">
            Gere a lista de presença e carga horária para cursos homologados pela ANAC.
          </p>
        </div>
        {reportData && (
          <Button onClick={handlePrint} className="bg-primary text-white shadow-md">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Relatório
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 print:hidden">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Curso</label>
          <Select value={selectedCurso} onValueChange={(val) => { setSelectedCurso(val); setSelectedTurma(''); }}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione um curso..." />
            </SelectTrigger>
            <SelectContent>
              {coursesOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Turma</label>
          <Select value={selectedTurma} onValueChange={setSelectedTurma} disabled={!selectedCurso || turmasQuery.isLoading}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione a turma..." />
            </SelectTrigger>
            <SelectContent>
              {turmasOptions.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {reportQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground print:hidden">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Gerando relatório...</p>
        </div>
      )}

      {reportData && (
        <div className="bg-white dark:bg-slate-950 border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none">
          {/* Cabeçalho do Relatório */}
          <div className="p-6 md:p-8 border-b print:border-b-2 print:border-black bg-slate-50 dark:bg-slate-900/50 print:bg-transparent">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold uppercase text-slate-900 dark:text-white print:text-black">
                  Lista de Frequência
                </h3>
                <p className="text-sm text-slate-500 mt-1 print:text-black">Relatório Oficial de Aulas ao Vivo</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold print:text-black">Data de Emissão</p>
                <p className="text-sm text-muted-foreground print:text-black">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase print:text-gray-600">Curso</p>
                <p className="font-semibold text-slate-900 dark:text-white print:text-black">{reportData.curso}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase print:text-gray-600">Turma</p>
                <p className="font-semibold text-slate-900 dark:text-white print:text-black">{reportData.turma}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase print:text-gray-600">Total de Aulas</p>
                <p className="font-semibold text-slate-900 dark:text-white print:text-black">{reportData.total_aulas} aulas</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase print:text-gray-600">Carga Horária</p>
                <p className="font-semibold text-slate-900 dark:text-white print:text-black">{Math.floor(reportData.total_minutos / 60)}h {(reportData.total_minutos % 60)}m</p>
              </div>
            </div>
          </div>

          {/* Filtro da Tabela */}
          <div className="p-4 border-b bg-white dark:bg-slate-950 print:hidden flex justify-between items-center">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar aluno no relatório..." 
                className="pl-9 h-10" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium">{filteredAlunos.length} alunos listados</span>
          </div>

          {/* Tabela de Frequência */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b print:bg-transparent print:border-b-2 print:border-black">
                <tr>
                  <th className="px-6 py-4">Aluno</th>
                  <th className="px-6 py-4 text-center">Aulas Assistidas</th>
                  <th className="px-6 py-4 text-center">Faltas</th>
                  <th className="px-6 py-4 text-center">% Presença</th>
                  <th className="px-6 py-4">Registro de Faltas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-300">
                {filteredAlunos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredAlunos.map((aluno: any) => (
                    <tr key={aluno.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 print:break-inside-avoid">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white print:text-black">{aluno.nome}</p>
                        <p className="text-xs text-muted-foreground print:text-gray-600">{aluno.email}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {aluno.presencas}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          aluno.faltas > 0 ? 'bg-red-100 text-red-700 print:border print:border-red-500' : 'text-slate-500'
                        }`}>
                          {aluno.faltas}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        <span className={aluno.percentual >= 75 ? 'text-green-600' : 'text-red-600'}>
                          {aluno.percentual}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs">
                        {aluno.aulas_faltadas.length > 0 ? (
                          <div className="space-y-1">
                            {aluno.aulas_faltadas.map((aula: any) => (
                              <div key={aula.id} className="truncate" title={aula.titulo}>
                                • {new Date(aula.inicio).toLocaleDateString('pt-BR')} - {aula.titulo}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-green-600 font-medium">100% de Presença</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border-t bg-slate-50 dark:bg-slate-900/50 hidden print:block text-xs text-center text-gray-500 mt-8">
            <p>Documento gerado eletronicamente através do sistema EAD Control.</p>
            <p>Para fins de comprovação junto à ANAC, este documento deve ser assinado digitalmente ou carimbado pelo diretor de ensino.</p>
            <div className="mt-16 w-64 mx-auto border-t border-black pt-2">
              <p className="text-black font-bold">Assinatura do Responsável</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
