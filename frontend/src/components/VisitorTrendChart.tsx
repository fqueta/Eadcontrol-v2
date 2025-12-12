import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface VisitorData {
  week: string;
  visitors: number;
}

interface VisitorTrendChartProps {
  data?: VisitorData[];
  title?: string;
}

/**
 * Componente de gráfico de tendência de visitantes
 * Replica o estilo visual da imagem fornecida com linha laranja e crescimento exponencial
 */
export function VisitorTrendChart({ 
  title = "Tendência de Visitantes",
  data = [
    { week: 'Semana 5', visitors: 8 },
    { week: 'Semana 6', visitors: 12 },
    { week: 'Semana 7', visitors: 15 },
    { week: 'Semana 8', visitors: 18 },
    { week: 'Semana 9', visitors: 22 },
    { week: 'Semana 11', visitors: 28 },
    { week: 'Semana 13', visitors: 35 },
    { week: 'Semana 36', visitors: 45 },
    { week: 'Semana 38', visitors: 65 },
    { week: 'Semana 40', visitors: 125 }
  ]
}: VisitorTrendChartProps) {

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                vertical={false}
              />
              <XAxis 
                dataKey="week" 
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9ca3af' }}
                domain={[0, 'dataMax + 10']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
                labelStyle={{ color: '#374151', fontWeight: '500' }}
                formatter={(value: number) => [value, 'Visitantes']}
              />
              <Line
                type="monotone"
                dataKey="visitors"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ 
                  fill: '#f97316', 
                  strokeWidth: 2, 
                  r: 5,
                  stroke: '#fff'
                }}
                activeDot={{ 
                  r: 7, 
                  stroke: '#f97316', 
                  strokeWidth: 3,
                  fill: '#fff'
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}