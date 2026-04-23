import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import { createGenericService } from '@/services/GenericApiService';
import { toast } from '@/hooks/use-toast';
import { Settings, ImagePlus, Trash2, Pencil, GripVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const optionsService = createGenericService('/options');

type Props = {
  onChanged?: (url: string) => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

type StaticSlide = {
  url: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

/**
 * HeroImageEditor
 * pt-BR: Editor que permite adicionar e gerenciar múltiplos banners ao carrossel (via localStorage/DB).
 */
export default function HeroImageEditor({ onChanged, className, size = 'sm' }: Props) {
  const { user } = useAuth();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [slides, setSlides] = useState<StaticSlide[]>([]);
  
  // Settings state
  const [showOverlay, setShowOverlay] = useState(() => localStorage.getItem('home_hero_show_overlay') !== 'false');
  const [showTexts, setShowTexts] = useState(() => localStorage.getItem('home_hero_show_texts') !== 'false');
  const [showButton, setShowButton] = useState(() => localStorage.getItem('home_hero_show_button') !== 'false');
  const [intervalSecs, setIntervalSecs] = useState(() => Number(localStorage.getItem('home_hero_autoplay_interval') || 6));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Apenas administradores podem editar
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;

  useEffect(() => {
    if (!managerOpen) return;
    const loadSlides = () => {
      const stored = localStorage.getItem('home_hero_images');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSlides(parsed.map(item => typeof item === 'string' ? { url: item } : item));
            return;
          }
        } catch {}
      }
      setSlides([]);
    };
    loadSlides();
  }, [managerOpen]);

  if (!canEdit) return null;

  const saveSlides = async (newSlides: StaticSlide[]) => {
    try {
      const imagesJson = JSON.stringify(newSlides);
      await optionsService.customPost('/all', { 
        home_hero_image_url: newSlides.length > 0 ? newSlides[0].url : '',
        home_hero_images: imagesJson 
      });

      localStorage.setItem('home_hero_image_url', newSlides.length > 0 ? newSlides[0].url : '');
      localStorage.setItem('home_hero_images', imagesJson);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('hero_images_updated'));
      setSlides(newSlides);
      if (newSlides.length > 0) onChanged?.(newSlides[0].url);
      
    } catch (e: any) {
      toast({ title: 'Falha ao salvar', description: e?.message || 'Erro', variant: 'destructive' });
    }
  };

  const handleSelectMedia = async (item: any) => {
    const url = item?.file?.url || item?.url || '';
    if (!url) return;
    const newSlides = [...slides, { url }];
    await saveSlides(newSlides);
    toast({ title: 'Banner adicionado', description: 'O carrossel agora possui ' + newSlides.length + ' imagens.' });
    setMediaOpen(false);
  };

  const handleRemoveSlide = async (index: number) => {
    if (!window.confirm('Deseja remover este banner?')) return;
    const newSlides = [...slides];
    newSlides.splice(index, 1);
    await saveSlides(newSlides);
    toast({ title: 'Banner removido' });
  };

  const handleUpdateSlide = (index: number, field: 'title' | 'subtitle' | 'buttonLabel' | 'buttonUrl', value: string) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setSlides(newSlides);
  };

  const handleSaveAll = async () => {
    await saveSlides(slides);
    toast({ title: 'Alterações salvas com sucesso!' });
    setManagerOpen(false);
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Deseja limpar todos os banners customizados e voltar ao padrão?')) return;
    
    try {
      await optionsService.customPost('/all', { 
        home_hero_image_url: '', 
        home_hero_images: '[]' 
      });
      localStorage.removeItem('home_hero_image_url');
      localStorage.removeItem('home_hero_images');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('hero_images_updated'));
      toast({ title: 'Banners resetados' });
    } catch (e: any) {
      toast({ title: 'Falha ao resetar', variant: 'destructive' });
    }
  };

  const handleSettingChange = async (key: string, value: any, setter: (v: any) => void) => {
    setter(value);
    const strValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
    localStorage.setItem(key, strValue);
    window.dispatchEvent(new Event('hero_settings_updated'));
    
    try {
      await optionsService.customPost('/all', { [key]: strValue });
    } catch (e) {
      console.error('Failed to save setting to DB', e);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newSlides = [...slides];
    const draggedItem = newSlides[draggedIndex];
    newSlides.splice(draggedIndex, 1);
    newSlides.splice(index, 0, draggedItem);
    
    setSlides(newSlides);
    setDraggedIndex(null);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 md:h-16 md:w-16 rounded-xl border-white/20 text-white bg-slate-800/40 hover:bg-slate-700/60 backdrop-blur-md shadow-2xl flex-shrink-0"
            title="Configurações do Banner"
          >
            <Settings className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4 z-[100] bg-white dark:bg-slate-900" align="end" sideOffset={10}>
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">Configurações de Exibição</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="showOverlay" className="cursor-pointer">Camada Escura (Overlay)</Label>
              <Switch 
                id="showOverlay" 
                checked={showOverlay} 
                onCheckedChange={(v) => handleSettingChange('home_hero_show_overlay', v, setShowOverlay)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showTexts" className="cursor-pointer">Textos e Logo</Label>
              <Switch 
                id="showTexts" 
                checked={showTexts} 
                onCheckedChange={(v) => handleSettingChange('home_hero_show_texts', v, setShowTexts)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showButton" className="cursor-pointer">Botão de Ação</Label>
              <Switch 
                id="showButton" 
                checked={showButton} 
                onCheckedChange={(v) => handleSettingChange('home_hero_show_button', v, setShowButton)} 
              />
            </div>
            <div className="space-y-2 mt-4 pt-4 border-t">
              <Label htmlFor="intervalSecs" className="text-xs text-slate-500">Tempo de Exibição (segundos)</Label>
              <Input 
                id="intervalSecs"
                type="number" 
                min={2} 
                max={60}
                value={intervalSecs}
                onChange={(e) => handleSettingChange('home_hero_autoplay_interval', Number(e.target.value), setIntervalSecs)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="secondary" 
            className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 h-12 w-12 md:h-16 md:w-auto md:px-6 rounded-xl font-medium shadow-2xl flex-shrink-0 p-0 md:p-6"
            title="Gerenciar Banners"
          >
            <Pencil className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">Gerenciar Banners</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Banners do Carrossel</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {slides.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum banner configurado. O sistema está usando o banner padrão.
              </div>
            ) : (
              <div className="space-y-4">
                {slides.map((slide, index) => (
                  <div 
                    key={index} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={`flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 relative cursor-grab active:cursor-grabbing transition-colors hover:border-slate-300 ${draggedIndex === index ? 'opacity-40 border-dashed border-primary' : ''}`}
                  >
                    <div className="hidden sm:flex items-center justify-center cursor-grab active:cursor-grabbing px-1 text-slate-400 hover:text-slate-600">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="w-full sm:w-48 h-32 flex-shrink-0 rounded-md overflow-hidden bg-slate-200">
                      <img src={slide.url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-3 mt-2 sm:mt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase">Título</Label>
                          <Input 
                            placeholder="Ex: Sua plataforma de ensino..." 
                            value={slide.title || ''} 
                            onChange={(e) => handleUpdateSlide(index, 'title', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase">Subtítulo</Label>
                          <Input 
                            placeholder="Ex: Soluções educacionais..." 
                            value={slide.subtitle || ''} 
                            onChange={(e) => handleUpdateSlide(index, 'subtitle', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase">Texto do Botão</Label>
                          <Input 
                            placeholder="Ex: Conhecer Cursos" 
                            value={slide.buttonLabel || ''} 
                            onChange={(e) => handleUpdateSlide(index, 'buttonLabel', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase">Link do Botão (URL)</Label>
                          <Input 
                            placeholder="Ex: /cursos ou https://..." 
                            value={slide.buttonUrl || ''} 
                            onChange={(e) => handleUpdateSlide(index, 'buttonUrl', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => handleRemoveSlide(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button onClick={() => setMediaOpen(true)} variant="outline">
                <ImagePlus className="w-4 h-4 mr-2" />
                Adicionar Novo Slide
              </Button>
              <Button onClick={handleSaveAll} className="bg-primary">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Button
        size="icon"
        variant="outline"
        onClick={handleReset}
        className="h-12 w-12 md:h-16 md:w-16 rounded-xl border-white/20 text-white bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md shadow-2xl flex-shrink-0"
        title="Resetar Banners"
      >
        <span className="hidden md:inline text-xs font-bold">Limpar</span>
        <Trash2 className="md:hidden h-5 w-5" />
      </Button>

      <MediaLibraryModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={handleSelectMedia}
        defaultFilters={{ mime: 'image/' }}
      />
    </div>
  );
}
