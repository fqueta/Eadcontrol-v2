import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { createGenericService } from '@/services/GenericApiService';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const optionsService = createGenericService('/options');

export interface FooterConfig {
  backgroundColor: string;
  gradientColorTo?: string;
  textColor?: string;
  titleColor?: string;
}

const DEFAULT_CONFIG: FooterConfig = {
  backgroundColor: "#020617",
  gradientColorTo: "",
  textColor: "#94a3b8",
  titleColor: "#ffffff"
};

interface Props {
  onConfigChange: (config: FooterConfig) => void;
  currentConfig?: FooterConfig;
}

export function FooterEditor({ onConfigChange, currentConfig }: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<FooterConfig>(currentConfig || DEFAULT_CONFIG);
  
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;

  useEffect(() => {
    if (currentConfig) setConfig(currentConfig);
  }, [currentConfig]);

  if (!canEdit) return null;

  const handleChange = (field: keyof FooterConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSave = async () => {
    try {
      await optionsService.customPost('/all', { 
        footer_config: JSON.stringify(config) 
      });
      localStorage.setItem('footer_config', JSON.stringify(config));
      toast({ title: 'Configurações salvas!', description: 'O layout do rodapé foi atualizado.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha na conexão', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    if (!window.confirm('Resetar para o padrão?')) return;
    setConfig(DEFAULT_CONFIG);
    onConfigChange(DEFAULT_CONFIG);
  };

  return (
    <div className="absolute top-4 right-4 z-[50] flex flex-col gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-2xl h-14 w-14 p-0 bg-primary hover:scale-110 transition-transform relative group border-2 border-white/20"
            title="Editar Seção do Rodapé"
          >
            <Settings className="h-6 w-6 animate-spin-slow" />
            <span className="absolute right-16 bg-primary text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
              Editar Rodapé
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-6 z-[101] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border-none" align="end" side="top" sideOffset={15}>
          <div className="space-y-4">
            <div className="border-b pb-2 mb-4">
              <h4 className="font-black text-lg uppercase tracking-tight text-primary">Editar Rodapé</h4>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Personalize o rodapé em tempo real</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Fundo (De)</Label>
                  <Input 
                    type="color" 
                    value={config.backgroundColor} 
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="h-9 w-full p-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Gradiente (Para)</Label>
                  <Input 
                    type="color" 
                    value={config.gradientColorTo || config.backgroundColor} 
                    onChange={(e) => handleChange('gradientColorTo', e.target.value)}
                    className="h-9 w-full p-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Cor dos Títulos</Label>
                  <Input 
                    type="color" 
                    value={config.titleColor || '#ffffff'} 
                    onChange={(e) => handleChange('titleColor', e.target.value)}
                    className="h-9 w-full p-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Cor do Texto</Label>
                  <Input 
                    type="color" 
                    value={config.textColor || '#94a3b8'} 
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="h-9 w-full p-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t mt-4">
              <Button onClick={handleSave} className="flex-1 font-bold">
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

export default FooterEditor;
