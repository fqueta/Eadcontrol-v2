
import React, { useMemo } from 'react';
import { Check, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuizGradeDetailProps {
  activity: any;
}

export function QuizGradeDetail({ activity }: QuizGradeDetailProps) {
  const questions = (activity?.quiz_questions || []) as any[];
  const config = activity?.config || {};
  const answers = config.answers || {};
  
  // Determine scores
  const details = useMemo(() => {
    let totalPoints = 0;
    let achievedPoints = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    
    // Check if points are defined in questions, otherwise default to 1?
    // The image implies points per question. Let's assume 1 if not present.
    // Or if activity has total points, distribute?
    // Let's stick to 1 point per question for now or usage of 'pontos' field if exists.
    
    const rows = questions.map((q, idx) => {
        const qId = q.id || idx;
        const answer = answers[qId];
        let isCorrect = false;
        let points = Number(q.pontos || 1); // Default to 1 point if not set
        
        if (q.tipo_pergunta === 'multipla_escolha') {
            const correctOpt = q.opcoes?.find((o: any) => o.correta === true || o.correta === 's');
            if (correctOpt && String(correctOpt.id) === String(answer)) {
                isCorrect = true;
            }
        } else if (q.tipo_pergunta === 'verdadeiro_falso') {
            if (String(q.resposta_correta) === String(answer)) {
                isCorrect = true;
            }
        }
        
        const earned = isCorrect ? points : 0;
        
        totalPoints += points;
        achievedPoints += earned;
        if (isCorrect) correctCount++; else incorrectCount++;
        
        return {
            index: idx + 1,
            isCorrect,
            points,
            earned,
            answered: answer !== undefined
        };
    });
    
    return { rows, totalPoints, achievedPoints, correctCount, incorrectCount };
  }, [questions, answers]);

  const percentage = details.totalPoints > 0 ? Math.round((details.achievedPoints / details.totalPoints) * 100) : 0;
  
  // Status Badge Logic
  let statusColor = "bg-red-500";
  let statusText = "Insuficiente";
  if (percentage >= 70) {
      statusColor = "bg-green-500";
      statusText = "Nota Boa"; // As per image
  } else if (percentage >= 50) {
      statusColor = "bg-yellow-500";
      statusText = "Regular";
  }

  return (
    <div className="bg-background rounded-md border p-4 text-sm mt-4">
        {/* Header Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
                <div className="font-semibold text-muted-foreground">Questões: <span className="text-foreground">{questions.length}</span></div>
                <div className="text-green-600 font-medium">Certas: {details.correctCount}</div>
            </div>
            <div>
                 <div className="font-semibold text-muted-foreground">Valor da prova: <span className="text-foreground">{details.totalPoints} Pts</span></div>
                 <div className="text-red-500 font-medium">Erradas: {details.incorrectCount}</div>
            </div>
            <div>
                <div className="font-semibold text-muted-foreground">Alcançado: <span className="text-foreground">{details.achievedPoints} Pts</span></div>
                <Badge className={`${statusColor} hover:${statusColor} text-white mt-1 border-0`}>{statusText} {percentage}%</Badge>
            </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-primary/90 text-primary-foreground">
                        <th className="p-2 font-medium">Questões</th>
                        <th className="p-2 font-medium">Resposta</th>
                        <th className="p-2 font-medium text-center">Pts Questão</th>
                        <th className="p-2 font-medium text-center">Pts Alc</th>
                    </tr>
                </thead>
                <tbody>
                    {details.rows.map((row) => (
                        <tr key={row.index} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-2 text-primary">{row.index}</td>
                            <td className="p-2">
                                {row.answered ? (
                                    <div className="flex items-center gap-1 font-medium">
                                        {row.isCorrect ? (
                                            <>
                                                <Check className="h-4 w-4 text-green-600" />
                                                <span className="text-green-700">Certa</span>
                                            </>
                                        ) : (
                                            <>
                                                <X className="h-4 w-4 text-red-500 text-xs bg-red-100 rounded-full p-0.5" /> 
                                                {/* Adjusted icon to match image style slightly better or just generic */}
                                                <span className="text-red-600">Errada</span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground italic">Não respondida</span>
                                )}
                            </td>
                            <td className="p-2 text-center text-muted-foreground">{row.points}</td>
                            <td className="p-2 text-center font-medium text-green-700">{row.earned}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        {/* Footer Totals */}
        <div className="mt-4 space-y-2 border-t pt-4 bg-muted/10">
            <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground">Total de pontos distribuídos</span>
                <span className="font-bold">{details.totalPoints} pts</span>
            </div>
             <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold text-foreground">Total de pontos alcançados</span>
                <span className="font-bold">{details.achievedPoints} pts</span>
            </div>
             <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground">Total de questões: <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600 ml-1 h-5">{questions.length}</Badge></span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground">Questões respondidas: <Badge variant="secondary" className="bg-cyan-600 text-white hover:bg-cyan-700 ml-1 h-5">{Object.keys(answers).length}</Badge></span>
            </div>
             <div className="flex justify-between items-center text-xs sm:text-sm border-t pt-2">
                <span className="font-medium text-muted-foreground">Aproveitamento <span className="font-bold text-foreground">{percentage} %</span></span>
                <Badge className={`${statusColor} hover:${statusColor} text-white border-0`}>{statusText}</Badge>
            </div>
        </div>
    </div>
  );
}
