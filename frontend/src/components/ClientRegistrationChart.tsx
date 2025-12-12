import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ClientRegistrationData {
  date: string;
  actived: number;
  inactived: number;
  pre_registred: number;
}

interface ClientRegistrationChartProps {
  data: ClientRegistrationData[];
  title?: string;
  description?: string;
}

/**
 * Componente de gráfico de linha para acompanhar cadastros de clientes por status
 * Exibe tendências de cadastros ativos, inativos e pré-cadastros ao longo do tempo
 * Utiliza Recharts para visualizações responsivas e modernas
 */
export function ClientRegistrationChart({ 
  data, 
  title = "Evolução dos Cadastros", 
  description = "Acompanhamento diário dos cadastros por status" 
}: ClientRegistrationChartProps) {
  // Calcular totais para cada status
  const totals = data.reduce(
    (acc, item) => ({
      actived: acc.actived + item.actived,
      inactived: acc.inactived + item.inactived,
      pre_registred: acc.pre_registred + item.pre_registred,
    }),
    { actived: 0, inactived: 0, pre_registred: 0 }
  );

  // Calcular tendência (comparar últimos 3 dias com 3 anteriores)
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);
  
  const firstHalfTotal = firstHalf.reduce((acc, item) => acc + item.actived + item.inactived + item.pre_registred, 0);
  const secondHalfTotal = secondHalf.reduce((acc, item) => acc + item.actived + item.inactived + item.pre_registred, 0);
  
  const trend = secondHalfTotal > firstHalfTotal ? 'up' : 'down';
  const trendPercentage = firstHalfTotal > 0 ? Math.abs(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100) : 0;
  
  // Formatar dados para o gráfico com tratamento robusto de datas
  const chartData = data.map((item, index) => {
    // Criar data de forma mais robusta para evitar problemas de timezone
    const dateParts = item.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // JavaScript months são 0-indexed
    const day = parseInt(dateParts[2]);
    
    const dateObj = new Date(year, month, day);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    return {
      ...item,
      date: formattedDate
    };
  });
  
  // Debug apenas para verificar se todos os dados estão presentes
  if (data.length !== chartData.length) {
    console.warn('Discrepância no número de itens:', { original: data.length, processado: chartData.length });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Gráfico usando Recharts */}
        <div className="h-96 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 80,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Line
                type="monotone"
                dataKey="actived"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name="Ativos"
              />
              <Line
                type="monotone"
                dataKey="inactived"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                name="Inativos"
              />
              <Line
                type="monotone"
                dataKey="pre_registred"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                name="Pré-cadastro"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo dos totais */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{totals.actived}</div>
            <div className="text-sm text-green-600 font-medium">Ativos</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{totals.inactived}</div>
            <div className="text-sm text-red-600 font-medium">Inativos</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{totals.pre_registred}</div>
            <div className="text-sm text-yellow-600 font-medium">Pré-cadastro</div>
          </div>
        </div>

        {/* Indicador de tendência */}
        <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg border">
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? '+' : '-'}{trendPercentage.toFixed(1)}% vs período anterior
          </span>
        </div>
      </CardContent>
    </Card>
  );
}