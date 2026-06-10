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

export interface CtaConfig {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  backgroundColor: string;
  gradientColorTo: string;
  showPattern: boolean;
  textColor: string;
  descriptionColor: string;
  titleSize: string;
  textAlign: 'left' | 'center' | 'right';
  marginTop: string;
  marginBottom: string;
  paddingTop: string;
  paddingBottom: string;
}

export const DEFAULT_CTA_CONFIG: CtaConfig = {
  enabled: true,
  title: "Pronto para o próximo nível?",
  description: "Junte-se a centenas de instituições que já transformaram seu processo pedagógico com inclusividade e tecnologia.",
  buttonText: "Começar Agora",
  buttonLink: "/register",
  secondaryButtonText: "Ver Site Oficial",
  secondaryButtonLink: "https://incluireeducar.com.br/",
  backgroundColor: "#1e3a8a", // bg-blue-900
  gradientColorTo: "#312e81", // bg-indigo-900
  showPattern: true,
  textColor: "#ffffff",
  descriptionColor: "#dbeafe", // text-blue-100
  titleSize: "3.75rem",
  textAlign: "center",
  marginTop: "0rem",
  marginBottom: "0rem",
  paddingTop: "8rem", // py-32 -> 8rem
  paddingBottom: "8rem",
};

interface Props {
  onConfigChange: (config: CtaConfig) => void;
  currentConfig?: CtaConfig;
}

export function CtaEditor({ onConfigChange, currentConfig }: Props) {
  const { user } = useAuth();
  const [config, setConfig] = useState<CtaConfig>(currentConfig || DEFAULT_CTA_CONFIG);
  
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;

  useEffect(() => {
    if (currentConfig) setConfig(currentConfig);
  }, [currentConfig]);

  if (!canEdit) return null;

  const handleChange = (field: keyof CtaConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSave = async () => {
    try {
      await optionsService.customPost('/all', { 
        cta_config: JSON.stringify(config) 
      });
      localStorage.setItem('cta_config', JSON.stringify(config));
      toast({ title: 'Configurações salvas!', description: 'O layout da seção CTA foi atualizado.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha na conexão', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    if (!window.confirm('Resetar para o padrão?')) return;
    setConfig(DEFAULT_CTA_CONFIG);
    onConfigChange(DEFAULT_CTA_CONFIG);
  };

  return (
    <div className="absolute top-8 left-8 z-[50] flex flex-col gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-2xl h-14 w-14 p-0 bg-blue-600 hover:bg-blue-700 hover:scale-110 transition-transform relative group text-white border-none"
            title="Editar Seção CTA"
          >
            <Settings className="h-6 w-6 animate-spin-slow" />
            <span className="absolute left-16 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
              Editar CTA
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-6 z-[101] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border-none max-h-[85vh] overflow-y-auto" align="start" side="top" sideOffset={15}>
          <div className="space-y-4">
            <div className="border-b pb-2 mb-4 flex justify-between items-center">
              <div>
                <h4 className="font-black text-lg uppercase tracking-tight text-blue-600 dark:text-blue-400">Editar CTA</h4>
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

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Descrição</Label>
                <textarea 
                  value={config.description} 
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full min-h-[80px] p-2 text-sm rounded-md border border-input bg-background font-medium"
                />
              </div>

              <div className="border-t pt-2 my-2">
                <h5 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-2">Botão Principal</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Texto</Label>
                    <Input 
                      value={config.buttonText} 
                      onChange={(e) => handleChange('buttonText', e.target.value)}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Link</Label>
                    <Input 
                      value={config.buttonLink} 
                      onChange={(e) => handleChange('buttonLink', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-2 my-2">
                <h5 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-2">Botão Secundário</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Texto</Label>
                    <Input 
                      value={config.secondaryButtonText} 
                      onChange={(e) => handleChange('secondaryButtonText', e.target.value)}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Link</Label>
                    <Input 
                      value={config.secondaryButtonLink} 
                      onChange={(e) => handleChange('secondaryButtonLink', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-2 my-2">
                <h5 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 mb-2">Estilos e Fundo</h5>
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Cor de Fundo (De)</Label>
                    <Input 
                      type="color" 
                      value={config.backgroundColor} 
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="h-8 w-full p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Gradiente (Para)</Label>
                    <Input 
                      type="color" 
                      value={config.gradientColorTo} 
                      onChange={(e) => handleChange('gradientColorTo', e.target.value)}
                      className="h-8 w-full p-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Cor do Título</Label>
                    <Input 
                      type="color" 
                      value={config.textColor} 
                      onChange={(e) => handleChange('textColor', e.target.value)}
                      className="h-8 w-full p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Cor Descrição</Label>
                    <Input 
                      type="color" 
                      value={config.descriptionColor} 
                      onChange={(e) => handleChange('descriptionColor', e.target.value)}
                      className="h-8 w-full p-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Tam. Fonte</Label>
                    <Input 
                      value={config.titleSize} 
                      onChange={(e) => handleChange('titleSize', e.target.value)}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Alinhamento</Label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => handleChange('textAlign', align)}
                          className={`flex-1 flex items-center justify-center py-1 rounded transition-all ${
                            config.textAlign === align 
                              ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {align === 'left' && <AlignLeft className="h-3 w-3" />}
                          {align === 'center' && <AlignCenter className="h-3 w-3" />}
                          {align === 'right' && <AlignRight className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 mb-2">
                  <Label className="text-xs font-bold">Mostrar Textura Cubos</Label>
                  <Switch 
                    checked={config.showPattern} 
                    onCheckedChange={(v) => handleChange('showPattern', v)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Margem Top</Label>
                    <Input 
                      value={config.marginTop} 
                      onChange={(e) => handleChange('marginTop', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Margem Bottom</Label>
                    <Input 
                      value={config.marginBottom} 
                      onChange={(e) => handleChange('marginBottom', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Padding Top</Label>
                    <Input 
                      value={config.paddingTop} 
                      onChange={(e) => handleChange('paddingTop', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Padding Bottom</Label>
                    <Input 
                      value={config.paddingBottom} 
                      onChange={(e) => handleChange('paddingBottom', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t mt-4">
              <Button onClick={handleSave} className="flex-1 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
              <Button onClick={handleReset} variant="outline" size="icon" title="Resetar" className="border border-input">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
