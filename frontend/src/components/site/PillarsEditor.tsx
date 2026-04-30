import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { createGenericService } from '@/services/GenericApiService';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, RotateCcw, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const optionsService = createGenericService('/options');

export interface PillarsConfig {
  enabled: boolean;
  title: string;
  backgroundColor: string;
  titleColor: string;
  titleSize: string;
  textAlign: 'left' | 'center' | 'right';
  marginTop: string;
  marginBottom: string;
  paddingTop: string;
  paddingBottom: string;
}

export const DEFAULT_PILLARS_CONFIG: PillarsConfig = {
  enabled: true,
  title: "Nossos Pilares",
  backgroundColor: "transparent",
  titleColor: "#0f172a",
  titleSize: "3rem",
  textAlign: "center",
  marginTop: "0rem",
  marginBottom: "0rem",
  paddingTop: "8rem",
  paddingBottom: "8rem",
};

interface Props {
  onConfigChange: (config: PillarsConfig) => void;
  currentConfig?: PillarsConfig;
}

export function PillarsEditor({ onConfigChange, currentConfig }: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<PillarsConfig>(currentConfig || DEFAULT_PILLARS_CONFIG);
  
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;

  useEffect(() => {
    if (currentConfig) setConfig(currentConfig);
  }, [currentConfig]);

  if (!canEdit) return null;

  const handleChange = (field: keyof PillarsConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSave = async () => {
    try {
      await optionsService.customPost('/all', { 
        pillars_config: JSON.stringify(config) 
      });
      localStorage.setItem('pillars_config', JSON.stringify(config));
      toast({ title: 'Configurações salvas!', description: 'O layout dos pilares foi atualizado.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha na conexão', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    if (!window.confirm('Resetar para o padrão?')) return;
    setConfig(DEFAULT_PILLARS_CONFIG);
    onConfigChange(DEFAULT_PILLARS_CONFIG);
  };

  return (
    <div className="absolute top-8 left-8 z-[50] flex flex-col gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-2xl h-14 w-14 p-0 bg-indigo-600 hover:bg-indigo-700 hover:scale-110 transition-transform relative group"
            title="Editar Seção de Pilares"
          >
            <Settings className="h-6 w-6 animate-spin-slow" />
            <span className="absolute left-16 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
              Editar Pilares
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-6 z-[101] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border-none" align="start" side="top" sideOffset={15}>
          <div className="space-y-4">
            <div className="border-b pb-2 mb-4 flex justify-between items-center">
              <div>
                <h4 className="font-black text-lg uppercase tracking-tight text-indigo-600">Editar Pilares</h4>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Personalize esta seção</p>
              </div>
              <div className="flex items-center gap-2">
                {config.enabled ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                <Switch 
                  checked={config.enabled} 
                  onCheckedChange={(v) => handleChange('enabled', v)} 
                />
              </div>
            </div>

            <div className={`space-y-3 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Título da Seção</Label>
                <Input 
                  value={config.title} 
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="h-9 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Cor de Fundo</Label>
                  <Input 
                    type="color" 
                    value={config.backgroundColor === 'transparent' ? '#ffffff' : config.backgroundColor} 
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="h-9 w-full p-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Cor do Título</Label>
                  <Input 
                    type="color" 
                    value={config.titleColor} 
                    onChange={(e) => handleChange('titleColor', e.target.value)}
                    className="h-9 w-full p-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Tam. Fonte</Label>
                  <Input 
                    value={config.titleSize} 
                    onChange={(e) => handleChange('titleSize', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Alinhamento</Label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => handleChange('textAlign', align)}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded transition-all ${
                          config.textAlign === align 
                            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="h-4 w-4" />}
                        {align === 'center' && <AlignCenter className="h-4 w-4" />}
                        {align === 'right' && <AlignRight className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Margem Top</Label>
                  <Input 
                    value={config.marginTop} 
                    onChange={(e) => handleChange('marginTop', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Margem Bottom</Label>
                  <Input 
                    value={config.marginBottom} 
                    onChange={(e) => handleChange('marginBottom', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Padding Top</Label>
                  <Input 
                    value={config.paddingTop} 
                    onChange={(e) => handleChange('paddingTop', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Padding Bottom</Label>
                  <Input 
                    value={config.paddingBottom} 
                    onChange={(e) => handleChange('paddingBottom', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t mt-4">
              <Button onClick={handleSave} className="flex-1 font-bold bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
              <Button onClick={handleReset} variant="outline" size="icon" title="Resetar">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
