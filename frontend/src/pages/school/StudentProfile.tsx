import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle, Save, KeyRound, Loader2, Camera, MapPin, User as UserIcon, Phone, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { getTenantApiUrl } from '@/lib/qlib';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, "Senha atual é obrigatória"),
  new_password: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  new_password_confirmation: z.string().min(6, "Confirmação de senha deve ter pelo menos 6 caracteres"),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "As senhas não coincidem",
  path: ["new_password_confirmation"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function StudentProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = useMemo(() => (user as any)?.email || (user as any)?.mail || '', [user]);
  
  // Enhanced photo logic to check multiple fields
  const userPhoto = useMemo(() => {
    // Check specific fields
    let path = (user as any)?.foto_perfil || user?.avatar; 
    
    // If it's a full URL (avatar_url sometimes returns this), use it directly
    if (user?.avatar_url && user.avatar_url.startsWith('http')) return user.avatar_url;

    // If we have a path, prepend storage URL
    if (path) {
        // If path already starts with http, return it (just in case)
        if (path.startsWith('http')) return path;
        
        // Normalize path: strict checking for storage prefix to avoid doubling
        path = path.replace(/^\//, ''); // Remove leading slash
        if (path.startsWith('storage/')) {
            path = path.replace('storage/', '');
        }

        // Clean api url to get base url
        const baseUrl = getTenantApiUrl().replace('/api', '');
        
        // Add timestamp if available to bust cache
        const timestamp = user?.updated_at ? `?t=${new Date(user.updated_at).getTime()}` : '';
        
        return `${baseUrl}/storage/${path}${timestamp}`;
    }
    
    return undefined;
  }, [user]);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: email,
      cpf: user?.cpf || '',
      phone: user?.phone || '',
      birth_date: user?.birth_date || '',
      gender: user?.gender || '',
      bio: user?.bio || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zip_code: user?.zip_code || '',
    },
    values: { // Update form when user data loads
      name: user?.name || '',
      email: email,
      cpf: user?.cpf || '',
      phone: user?.phone || '',
      birth_date: user?.birth_date || '',
      gender: user?.gender || '',
      bio: user?.bio || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zip_code: user?.zip_code || '',
    }
  });

  const { 
    register: registerPassword, 
    handleSubmit: handleSubmitPassword, 
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword } 
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
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
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });
    
    // Use context updateProfile which handles API + State update
    const success = await updateProfile(formData);
    
    if (success) {
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    const success = await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation
    });
    if (success) {
      setIsChangingPassword(false);
      resetPasswordForm();
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
        formData.append('name', user?.name || ''); // Some APIs require name when updating

        const success = await updateProfile(formData);
        if (success) {
            toast.success('Foto atualizada!');
        }
    } catch (error) {
        console.error(error);
    } finally {
        setUploading(false);
    }
  };

  const readOnlyClass = !isEditing ? "bg-muted/50 border-transparent shadow-none" : "bg-white dark:bg-slate-950";

  return (
    <InclusiveSiteLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-black/50 py-8 transition-colors duration-500">
        <div className="container mx-auto px-4 space-y-8 max-w-7xl">

          {/* Premium Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-900 text-white shadow-xl">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
             <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
             <div className="relative z-10 px-8 py-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white/20 shadow-xl transition-transform group-hover:scale-105">
                        <AvatarImage src={userPhoto} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-violet-200 text-violet-800">{getInitials(String(user?.name || 'Aluno'))}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-all backdrop-blur-sm">
                         {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
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
                   <div>
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{String(user?.name || 'Bem-vindo')}</h1>
                      <p className="text-violet-100 opacity-90 flex items-center gap-2">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-sm">{String(email || '—')}</span>
                      </p>
                   </div>
                </div>
                
                <Button 
                   onClick={() => setIsEditing(!isEditing)}
                   className={`${isEditing ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-violet-900 hover:bg-violet-50'} shadow-lg border-0 transition-all font-semibold min-w-[140px]`}
                >
                   {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
                </Button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* Left Column: Form Content */}
             <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                       <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                             <UserIcon className="w-5 h-5" />
                             <CardTitle>Dados Pessoais</CardTitle>
                          </div>
                          <CardDescription>Suas informações básicas de identificação</CardDescription>
                       </CardHeader>
                       <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 col-span-2">
                              <Label htmlFor="name">Nome Completo</Label>
                              <Input id="name" {...register('name')} readOnly={!isEditing} className={readOnlyClass} />
                              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                          </div>
                          
                          <div className="space-y-2">
                              <Label htmlFor="cpf">CPF</Label>
                              <Input id="cpf" {...register('cpf')} readOnly={!isEditing} className={readOnlyClass} placeholder="000.000.000-00" />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="birth_date">Data de Nascimento</Label>
                              <div className="relative">
                                 <Input id="birth_date" type="date" {...register('birth_date')} readOnly={!isEditing} className={readOnlyClass} />
                                 {!isEditing && <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground opacity-50" />}
                              </div>
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="gender">Gênero</Label>
                              {isEditing ? (
                                  <Select onValueChange={(val) => setValue('gender', val)} defaultValue={user?.gender || ''}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="M">Masculino</SelectItem>
                                      <SelectItem value="F">Feminino</SelectItem>
                                      <SelectItem value="O">Outro</SelectItem>
                                      <SelectItem value="N">Prefiro não informar</SelectItem>
                                    </SelectContent>
                                  </Select>
                              ) : (
                                  <Input value={user?.gender === 'M' ? 'Masculino' : user?.gender === 'F' ? 'Feminino' : user?.gender === 'O' ? 'Outro' : user?.gender === 'N' ? 'Prefiro não informar' : user?.gender || ''} readOnly className={readOnlyClass} />
                              )}
                          </div>

                          <div className="space-y-2 col-span-2">
                              <Label htmlFor="bio">Biografia / Sobre mim</Label>
                              <Textarea id="bio" {...register('bio')} readOnly={!isEditing} className={`resize-none ${readOnlyClass}`} rows={3} placeholder="Conte um pouco sobre você..." />
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                       <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                             <MapPin className="w-5 h-5" />
                             <CardTitle>Endereço e Contato</CardTitle>
                          </div>
                          <CardDescription>Como podemos entrar em contato com você</CardDescription>
                       </CardHeader>
                       <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 col-span-2 md:col-span-1">
                              <Label htmlFor="email">E-mail</Label>
                              <Input id="email" {...register('email')} readOnly={!isEditing} className={readOnlyClass} />
                              {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                          </div>

                           <div className="space-y-2 col-span-2 md:col-span-1">
                              <Label htmlFor="phone">Telefone / WhatsApp</Label>
                              <div className="relative">
                                 <Input id="phone" {...register('phone')} readOnly={!isEditing} className={readOnlyClass} placeholder="(00) 00000-0000" />
                                 {!isEditing && <Phone className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground opacity-50" />}
                              </div>
                          </div>

                          <div className="space-y-2 col-span-2 md:col-span-1">
                              <Label htmlFor="zip_code">CEP</Label>
                              <Input id="zip_code" {...register('zip_code')} readOnly={!isEditing} className={readOnlyClass} placeholder="00000-000" />
                          </div>

                          <div className="space-y-2 col-span-2">
                              <Label htmlFor="address">Endereço Completo</Label>
                              <Input id="address" {...register('address')} readOnly={!isEditing} className={readOnlyClass} placeholder="Rua, Número, Bairro" />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="city">Cidade</Label>
                              <Input id="city" {...register('city')} readOnly={!isEditing} className={readOnlyClass} />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="state">Estado (UF)</Label>
                              <Input id="state" {...register('state')} readOnly={!isEditing} className={readOnlyClass} maxLength={2} placeholder="SP" />
                          </div>
                       </CardContent>
                    </Card>
                </form>
             </div>

             {/* Right Column: Actions & Security */}
             <div className="space-y-6">
                 {isEditing && (
                    <Card className="border-2 border-violet-500/20 shadow-lg bg-violet-50 dark:bg-violet-900/10 sticky top-24">
                       <CardHeader>
                          <CardTitle className="text-violet-700 dark:text-violet-300">Salvar Alterações</CardTitle>
                          <CardDescription>Confirme os novos dados para atualizar seu perfil.</CardDescription>
                       </CardHeader>
                       <CardContent>
                          <Button 
                              onClick={handleSubmit(onSubmit)} 
                              disabled={isSubmitting} 
                              className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md h-12 text-lg"
                          >
                             {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Salvar Perfil
                          </Button>
                       </CardContent>
                    </Card>
                 )}

                 <Card className={`border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 transition-all ${isChangingPassword ? 'bg-violet-50 dark:bg-violet-900/10 ring-violet-200 dark:ring-violet-800' : 'bg-white dark:bg-slate-900'}`}>
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => !isChangingPassword && setIsChangingPassword(true)}>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <KeyRound className="w-5 h-5" />
                              <CardTitle>Segurança</CardTitle>
                          </div>
                          {isChangingPassword && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsChangingPassword(false); }}><X className="w-4 h-4" /></Button>}
                       </div>
                       <CardDescription>Gerencie o acesso à sua conta</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                       {!isChangingPassword ? (
                          <Button 
                            variant="outline" 
                            className="w-full justify-between h-auto py-3 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" 
                            onClick={() => setIsChangingPassword(true)}
                          >
                            <div className="flex flex-col items-start gap-1">
                               <span className="font-semibold text-slate-700 dark:text-slate-200">Alterar Senha</span>
                               <span className="text-xs text-muted-foreground font-normal">Atualize sua senha periodicamente.</span>
                            </div>
                            <KeyRound className="w-4 h-4 text-slate-400" />
                          </Button>
                       ) : (
                          <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                              <div className="space-y-2">
                                  <Label htmlFor="current_password">Senha Atual</Label>
                                  <Input id="current_password" type="password" {...registerPassword('current_password')} className="bg-white dark:bg-slate-950" />
                                  {passwordErrors.current_password && <span className="text-xs text-red-500">{passwordErrors.current_password.message}</span>}
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="new_password">Nova Senha</Label>
                                  <Input id="new_password" type="password" {...registerPassword('new_password')} className="bg-white dark:bg-slate-950" />
                                  {passwordErrors.new_password && <span className="text-xs text-red-500">{passwordErrors.new_password.message}</span>}
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="new_password_confirmation">Confirmar Nova Senha</Label>
                                  <Input id="new_password_confirmation" type="password" {...registerPassword('new_password_confirmation')} className="bg-white dark:bg-slate-950" />
                                  {passwordErrors.new_password_confirmation && <span className="text-xs text-red-500">{passwordErrors.new_password_confirmation.message}</span>}
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={isSubmittingPassword} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                                    {isSubmittingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Atualizar Senha
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)}>Cancelar</Button>
                              </div>
                          </form>
                       )}
                    </CardContent>
                 </Card>
             </div>

          </div>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}