import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import { createGenericService } from '@/services/GenericApiService';
import { toast } from '@/hooks/use-toast';

const optionsService = createGenericService('/options');

type Props = {
  onChanged?: (url: string) => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export default function HeroImageEditor({ onChanged, className, size = 'sm' }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const canEdit = !!user && Number(user?.permission_id ?? 9999) < 3;
  if (!canEdit) return null;

  const handleSelect = async (item: any) => {
    const url = item?.file?.url || item?.url || '';
    if (!url) return;
    try {
      await optionsService.customPost('/all', { home_hero_image_url: url });
      try {
        localStorage.setItem('home_hero_image_url', url);
      } catch {}
      window.dispatchEvent(new Event('storage'));
      onChanged?.(url);
      toast({ title: 'Imagem atualizada' });
    } catch (e: any) {
      toast({ title: 'Falha ao definir imagem', description: e?.message || 'Erro', variant: 'destructive' });
    } finally {
      setOpen(false);
    }
  };

  return (
    <>
      <Button 
        size={size} 
        variant="secondary" 
        onClick={() => setOpen(true)}
        className={className}
      >
        Alterar imagem
      </Button>
      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        defaultFilters={{ mime: 'image/' }}
      />
    </>
  );
}

