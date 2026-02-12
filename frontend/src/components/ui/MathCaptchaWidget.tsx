import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface MathCaptchaRef {
  reset: () => void;
}

interface MathCaptchaWidgetProps {
  onVerify: (a: number, b: number, answer: number) => void;
}

export const MathCaptchaWidget = forwardRef<MathCaptchaRef, MathCaptchaWidgetProps>(
  ({ onVerify }, ref) => {
    const [numA, setNumA] = useState(0);
    const [numB, setNumB] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');

    const generateChallenge = () => {
      const a = Math.floor(Math.random() * 9) + 1; // 1-9
      const b = Math.floor(Math.random() * 9) + 1; // 1-9
      setNumA(a);
      setNumB(b);
      setUserAnswer('');
      // Reset parent state
      onVerify(0, 0, 0);
    };

    useEffect(() => {
      generateChallenge();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      reset: generateChallenge,
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow only numbers
      if (!/^\d*$/.test(val)) return;
      
      setUserAnswer(val);
      
      const ansInt = parseInt(val, 10);
      if (!isNaN(ansInt)) {
        onVerify(numA, numB, ansInt);
      } else {
        onVerify(0, 0, 0);
      }
    };

    return (
      <div className="flex flex-col gap-2 p-4 border rounded-md bg-muted/20 w-full max-w-xs">
        <Label htmlFor="math-captcha" className="text-sm font-medium">
          Verificação de segurança
        </Label>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold select-none">
            {numA} + {numB} = ?
          </span>
          <Input
            id="math-captcha"
            type="text"
            inputMode="numeric"
            placeholder="?"
            value={userAnswer}
            onChange={handleChange}
            className="w-20 text-center font-medium"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={generateChallenge}
            title="Gerar novo desafio"
            className="h-9 w-9"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
);

MathCaptchaWidget.displayName = 'MathCaptchaWidget';
