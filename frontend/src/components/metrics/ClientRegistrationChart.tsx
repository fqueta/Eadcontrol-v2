import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
 * Componente para exibir gráfico de linha dos cadastros de clientes por status
 */
export function ClientRegistrationChart({ 
  data, 
  title = "Cadastros de Clientes", 
  description = "Acompanhamento dos cadastros por status" 
}: ClientRegistrationChartProps) {
  // Calcula valores máximos para normalização
  const maxValue = Math.max(
    ...data.flatMap(d => [d.actived, d.inactived, d.pre_registred])
  );

  // Calcula totais e tendências
  const totals = {
    actived: data.reduce((sum, d) => sum + d.actived, 0),
    inactived: data.reduce((sum, d) => sum + d.inactived, 0),
    pre_registred: data.reduce((sum, d) => sum + d.pre_registred, 0)
  };

  const lastWeek = data.slice(-7);
  const previousWeek = data.slice(-14, -7);
  
  const trends = {
    actived: lastWeek.reduce((sum, d) => sum + d.actived, 0) - previousWeek.reduce((sum, d) => sum + d.actived, 0),
    inactived: lastWeek.reduce((sum, d) => sum + d.inactived, 0) - previousWeek.reduce((sum, d) => sum + d.inactived, 0),
    pre_registred: lastWeek.reduce((sum, d) => sum + d.pre_registred, 0) - previousWeek.reduce((sum, d) => sum + d.pre_registred, 0)
  };

  /**
   * Renderiza indicador de tendência
   */
  const renderTrendIndicator = (trend: number) => {
    if (trend > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          <span className="text-xs">+{trend}</span>
        </div>
      );
    } else if (trend < 0) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="h-3 w-3 mr-1" />
          <span className="text-xs">{trend}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-gray-500">
        <Minus className="h-3 w-3 mr-1" />
        <span className="text-xs">0</span>
      </div>
    );
  };

  /**
   * Renderiza linha do gráfico
   */
  const renderLine = (values: number[], color: string) => {
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 80; // 80% da altura para deixar margem
      return `${x},${y}`;
    }).join(' ');

    return (
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        className="drop-shadow-sm"
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Resumo por Status */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-2xl font-bold text-green-700">{totals.actived}</div>
            <div className="text-xs text-green-600 mb-1">Ativos</div>
            {renderTrendIndicator(trends.actived)}
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="text-2xl font-bold text-red-700">{totals.inactived}</div>
            <div className="text-xs text-red-600 mb-1">Inativos</div>
            {renderTrendIndicator(trends.inactived)}
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{totals.pre_registred}</div>
            <div className="text-xs text-yellow-600 mb-1">Pré-cadastro</div>
            {renderTrendIndicator(trends.pre_registred)}
          </div>
        </div>

        {/* Gráfico de Linha */}
        <div className="h-64 w-full">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Grid de fundo */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            
            {/* Linhas do gráfico */}
            {renderLine(data.map(d => d.actived), "#16a34a")}
            {renderLine(data.map(d => d.inactived), "#dc2626")}
            {renderLine(data.map(d => d.pre_registred), "#ca8a04")}
            
            {/* Pontos nas linhas */}
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 100;
              return (
                <g key={index}>
                  <circle cx={x} cy={100 - (item.actived / maxValue) * 80} r="2" fill="#16a34a" />
                  <circle cx={x} cy={100 - (item.inactived / maxValue) * 80} r="2" fill="#dc2626" />
                  <circle cx={x} cy={100 - (item.pre_registred / maxValue) * 80} r="2" fill="#ca8a04" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legenda */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Ativos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Inativos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Pré-cadastro</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}