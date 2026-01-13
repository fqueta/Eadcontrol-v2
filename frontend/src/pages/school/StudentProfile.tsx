import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle, Save, KeyRound, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function StudentProfile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = useMemo(() => (user as any)?.email || (user as any)?.mail || '', [user]);
  const clientId = useMemo(() => (user as any)?.id_cliente || (user as any)?.client_id || (user as any)?.cliente_id || '', [user]);
  const userPhoto = (user as any)?.foto_perfil ? `${(import.meta.env.VITE_TENANT_API_URL || '').replace('/api', '')}/storage/${(user as any).foto_perfil}` : undefined;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: email,
    },
    values: { // Update form when user data loads
      name: user?.name || '',
      email: email,
    }
  });

  function getInitials(name?: string): string {
    const s = String(name || '').trim();
    if (!s) return 'AL';
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? 'L' : (parts[0]?.[1] ?? 'L');
    return `${first}${last}`.toUpperCase();
  }

  const onSubmit = async (data: ProfileFormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    
    // Use context updateProfile which handles API + State update
    const success = await updateProfile(formData);
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecione uma imagem válida.');
        return;
    }

    try {
        setUploading(true);
        const formData = new FormData();
        formData.append('foto_perfil', file);
        formData.append('name', user?.name || '');

        const success = await updateProfile(formData);
        if (success) {
            toast.success('Foto atualizada!');
        }
    } catch (error) {
        console.error(error);
        // Context already handles error toast mostly, but we can keep log
    } finally {
        setUploading(false);
    }
  };

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações e preferências</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-24 w-24 border-2 border-muted transition-opacity group-hover:opacity-80">
                  <AvatarImage src={userPhoto} className="object-cover" />
                  <AvatarFallback className="text-xl">{getInitials(String(user?.name || 'Aluno'))}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-all">
                   {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                />
              </div>

              <div className="space-y-1 flex-1">
                <div className="text-2xl font-semibold leading-tight">{String(user?.name || '—')}</div>
                <div className="text-base text-muted-foreground">{String(email || '—')}</div>
                {isEditing && <p className="text-xs text-blue-600 mt-1">Modo de edição ativo</p>}
              </div>

             <Button 
                variant={isEditing ? "destructive" : "outline"}
                onClick={() => setIsEditing(!isEditing)}
             >
                {isEditing ? 'Cancelar' : 'Editar Perfil'}
             </Button>
            </div>

            <Separator className="my-6" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                        id="name" 
                        {...register('name')} 
                        readOnly={!isEditing} 
                        className={!isEditing ? "bg-muted/50" : ""}
                    />
                    {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                        id="email" 
                        {...register('email')} 
                         readOnly={!isEditing}
                         className={!isEditing ? "bg-muted/50" : ""}
                    />
                    {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                </div>
                <div className="space-y-2">
                    <Label>Cliente ID</Label>
                    <Input value={String(clientId || '')} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                    <Label>Permissão</Label>
                    <Input value={String((user as any)?.permission_id ?? '—')} disabled className="bg-muted" />
                </div>
                </div>

                {isEditing && (
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </div>
                )}
            </form>
          </CardContent>
        </Card>

        {/* Quick actions section kept for context, though redundant with editing above */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-0 hover:shadow-sm transition-shadow opacity-50">
             {/* ... keeping other cards but disabling the first one or removing it could make sense. 
                 Leaving them for now as they might link to deeper settings. */}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <CardTitle className="text-base">Segurança</CardTitle>
              </div>
              <CardDescription>Senha e acesso</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = '/reset-password')}>Alterar Senha</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}