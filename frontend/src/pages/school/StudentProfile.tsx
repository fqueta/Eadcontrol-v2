import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle, Save, KeyRound, Loader2, Camera, MapPin, User as UserIcon, Phone, Calendar, X, Briefcase, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { getTenantApiUrl } from '@/lib/qlib';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mascaraCpf } from '@/lib/qlib';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import { cepApplyMask, cepRemoveMask } from '@/lib/masks/cep-apply-mask';
import { getSiteKey, getRecaptchaToken } from '@/lib/recaptcha';

const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().optional(),
  celular: z.string().optional(),
  genero: z.string().optional(),
  config: z.object({
    nascimento: z.string().optional(),
    rg: z.string().optional(),
    escolaridade: z.string().optional(),
    profissao: z.string().optional(),
    cep: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().optional(),
    observacoes: z.string().optional(),
  }).optional(),
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

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export default function StudentProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cpfValue, setCpfValue] = useState('');
  const [celularValue, setCelularValue] = useState('');
  const [cepValue, setCepValue] = useState('');
  
  // Estados para controlar visibilidade das senhas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = useMemo(() => (user as any)?.email || (user as any)?.mail || '', [user]);
  
  const userPhoto = useMemo(() => {
    let path = (user as any)?.foto_perfil || user?.avatar; 
    
    if (user?.avatar_url && user.avatar_url.startsWith('http')) return user.avatar_url;

    if (path) {
        if (path.startsWith('http')) return path;
        
        path = path.replace(/^\//, '');
        if (path.startsWith('storage/')) {
            path = path.replace('storage/', '');
        }

        const baseUrl = getTenantApiUrl().replace('/api', '');
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
      celular: user?.celular || '',
      genero: user?.genero || '',
      config: {
        nascimento: user?.config?.nascimento || '',
        rg: user?.config?.rg || '',
        escolaridade: user?.config?.escolaridade || '',
        profissao: user?.config?.profissao || '',
        cep: user?.config?.cep || '',
        endereco: user?.config?.endereco || '',
        numero: user?.config?.numero || '',
        complemento: user?.config?.complemento || '',
        bairro: user?.config?.bairro || '',
        cidade: user?.config?.cidade || '',
        uf: user?.config?.uf || '',
        observacoes: user?.config?.observacoes || '',
      }
    },
  });

  const { 
    register: registerPassword, 
    handleSubmit: handleSubmitPassword, 
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword } 
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  // Initialize masked values when user data loads
  useEffect(() => {
    if (user) {
      setCpfValue(user.cpf ? mascaraCpf(user.cpf) : '');
      setCelularValue(user.celular || '');
      setCepValue(user.config?.cep ? cepApplyMask(user.config.cep) : '');
      
      // Update form values
      setValue('name', user.name || '');
      setValue('email', email);
      setValue('cpf', user.cpf || '');
      setValue('celular', user.celular || '');
      setValue('genero', user.genero || '');
      setValue('config.nascimento', user.config?.nascimento || '');
      setValue('config.rg', user.config?.rg || '');
      setValue('config.escolaridade', user.config?.escolaridade || '');
      setValue('config.profissao', user.config?.profissao || '');
      setValue('config.cep', user.config?.cep || '');
      setValue('config.endereco', user.config?.endereco || '');
      setValue('config.numero', user.config?.numero || '');
      setValue('config.complemento', user.config?.complemento || '');
      setValue('config.bairro', user.config?.bairro || '');
      setValue('config.cidade', user.config?.cidade || '');
      setValue('config.uf', user.config?.uf || '');
      setValue('config.observacoes', user.config?.observacoes || '');
    }
  }, [user, email, setValue]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = cepApplyMask(e.target.value);
    setCepValue(masked);
    const clean = cepRemoveMask(masked);
    setValue('config.cep', clean);
    
    if (clean.length === 8) {
      fetchAddressByCep(clean);
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    try {
      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCepResponse = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      // Auto-fill address fields
      if (data.logradouro) setValue('config.endereco', data.logradouro);
      if (data.bairro) setValue('config.bairro', data.bairro);
      if (data.localidade) setValue('config.cidade', data.localidade);
      if (data.uf) setValue('config.uf', data.uf);
      
      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao consultar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = mascaraCpf(e.target.value);
    setCpfValue(masked);
    const clean = masked.replace(/\D/g, '');
    setValue('cpf', clean);
  };

  const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = phoneApplyMask(e.target.value);
    setCelularValue(masked);
    const clean = phoneRemoveMask(masked);
    setValue('celular', clean);
  };

  function getInitials(name?: string): string {
    const s = String(name || '').trim();
    if (!s) return 'AL';
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? 'L' : (parts[0]?.[1] ?? 'L');
    return `${first}${last}`.toUpperCase();
  }

  const onSubmit = async (data: ProfileFormValues) => {
    console.log('📤 Dados do formulário antes do envio:', data);
    
    // Criar FormData apenas para foto, senão enviar JSON
    const payload: any = {
      name: data.name,
      email: data.email,
    };

    // Adicionar campos opcionais apenas se tiverem valor
    if (data.cpf) payload.cpf = data.cpf;
    if (data.celular) payload.celular = data.celular;
    if (data.genero) payload.genero = data.genero;

    // Adicionar config com todos os campos
    if (data.config) {
      payload.config = {};
      Object.entries(data.config).forEach(([key, value]) => {
        if (value) {
          payload.config[key] = value;
        }
      });
    }

    console.log('📦 Payload JSON a ser enviado:', payload);
    
    const success = await updateProfile(payload);
    
    if (success) {
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } else {
      toast.error('Erro ao atualizar perfil. Verifique os dados.');
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

    if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
    }

    try {
        setUploading(true);
        const formData = new FormData();
        formData.append('foto_perfil', file);
        formData.append('name', user?.name || ''); 
        
        if (user?.email) {
            formData.append('email', user.email);
        }

        const success = await updateProfile(formData);
        
        if (e.target) {
            e.target.value = '';
        }

        if (success) {
            toast.success('Foto atualizada com sucesso!');
        }
    } catch (error: any) {
        console.error('Upload error:', error);
        const msg = error?.response?.data?.message || error?.body?.message || 'Erro ao atualizar foto.';
        toast.error(msg);
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
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white shadow-xl">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
             <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
             <div className="relative z-10 px-8 py-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white/20 shadow-xl transition-transform group-hover:scale-105">
                        <AvatarImage src={userPhoto} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-blue-100 text-primary">{getInitials(String(user?.name || 'Aluno'))}</AvatarFallback>
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
                      <p className="text-blue-50 opacity-90 flex items-center gap-2">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-sm">{String(email || '—')}</span>
                      </p>
                   </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <Button 
                       onClick={() => setIsEditing(!isEditing)}
                       className={`${isEditing ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-primary hover:bg-blue-50'} shadow-lg border-0 transition-all font-semibold min-w-[140px]`}
                    >
                       {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
                    </Button>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* Left Column: Form Content */}
             <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                       <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-primary dark:text-blue-400">
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
                              <Input 
                                id="cpf" 
                                value={cpfValue}
                                onChange={handleCpfChange}
                                readOnly={!isEditing} 
                                className={readOnlyClass} 
                                placeholder="000.000.000-00" 
                                maxLength={14}
                              />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="rg">RG</Label>
                              <Input id="rg" {...register('config.rg')} readOnly={!isEditing} className={readOnlyClass} placeholder="00.000.000-0" />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="nascimento">Data de Nascimento</Label>
                              <div className="relative">
                                 <Input id="nascimento" type="date" {...register('config.nascimento')} readOnly={!isEditing} className={readOnlyClass} />
                                 {!isEditing && <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground opacity-50" />}
                              </div>
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="genero">Gênero</Label>
                              {isEditing ? (
                                  <Select onValueChange={(val) => setValue('genero', val)} value={watch('genero') || ''}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="m">Masculino</SelectItem>
                                      <SelectItem value="f">Feminino</SelectItem>
                                      <SelectItem value="ni">Prefiro não informar</SelectItem>
                                    </SelectContent>
                                  </Select>
                              ) : (
                                  <Input value={user?.genero === 'm' ? 'Masculino' : user?.genero === 'f' ? 'Feminino' : user?.genero === 'ni' ? 'Prefiro não informar' : user?.genero || ''} readOnly className={readOnlyClass} />
                              )}
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="escolaridade">Escolaridade</Label>
                              <Input id="escolaridade" {...register('config.escolaridade')} readOnly={!isEditing} className={readOnlyClass} placeholder="Ex: Ensino Médio Completo" />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="profissao">Profissão</Label>
                              <Input id="profissao" {...register('config.profissao')} readOnly={!isEditing} className={readOnlyClass} placeholder="Ex: Estudante" />
                          </div>

                          <div className="space-y-2 col-span-2">
                              <Label htmlFor="observacoes">Observações</Label>
                              <Textarea id="observacoes" {...register('config.observacoes')} readOnly={!isEditing} className={`resize-none ${readOnlyClass}`} rows={3} placeholder="Informações adicionais..." />
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                       <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-primary dark:text-blue-400">
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
                              <Label htmlFor="celular">Celular / WhatsApp</Label>
                              <div className="relative">
                                 <Input 
                                   id="celular" 
                                   value={celularValue}
                                   onChange={handleCelularChange}
                                   readOnly={!isEditing} 
                                   className={readOnlyClass} 
                                   placeholder="+55 (00) 00000-0000" 
                                 />
                                 {!isEditing && <Phone className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground opacity-50" />}
                              </div>
                          </div>

                          <div className="space-y-2 col-span-2 md:col-span-1">
                              <Label htmlFor="cep">CEP</Label>
                              <div className="relative">
                                <Input 
                                  id="cep" 
                                  value={cepValue}
                                  onChange={handleCepChange}
                                  readOnly={!isEditing} 
                                  className={readOnlyClass} 
                                  placeholder="00000-000" 
                                  maxLength={9}
                                />
                                {loadingCep && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-primary" />}
                              </div>
                          </div>

                          <div className="space-y-2 col-span-2">
                              <Label htmlFor="endereco">Endereço</Label>
                              <Input id="endereco" {...register('config.endereco')} readOnly={!isEditing} className={readOnlyClass} placeholder="Rua, Avenida..." />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="numero">Número</Label>
                              <Input id="numero" {...register('config.numero')} readOnly={!isEditing} className={readOnlyClass} placeholder="123" />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="complemento">Complemento</Label>
                              <Input id="complemento" {...register('config.complemento')} readOnly={!isEditing} className={readOnlyClass} placeholder="Apt, Bloco..." />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="bairro">Bairro</Label>
                              <Input id="bairro" {...register('config.bairro')} readOnly={!isEditing} className={readOnlyClass} />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="cidade">Cidade</Label>
                              <Input id="cidade" {...register('config.cidade')} readOnly={!isEditing} className={readOnlyClass} />
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="uf">Estado (UF)</Label>
                              <Input id="uf" {...register('config.uf')} readOnly={!isEditing} className={readOnlyClass} maxLength={2} placeholder="SP" />
                          </div>
                       </CardContent>
                    </Card>
                </form>
             </div>

             {/* Right Column: Actions & Security */}
             <div className="space-y-6">
                 {isEditing && (
                    <Card className="border-2 border-blue-500/20 shadow-lg bg-blue-50 dark:bg-blue-900/10 sticky top-24">
                       <CardHeader>
                          <CardTitle className="text-primary dark:text-blue-300">Salvar Alterações</CardTitle>
                          <CardDescription>Confirme os novos dados para atualizar seu perfil.</CardDescription>
                       </CardHeader>
                       <CardContent>
                          <Button 
                              onClick={handleSubmit(onSubmit)} 
                              disabled={isSubmitting} 
                              className="w-full bg-primary hover:bg-blue-700 text-white shadow-md h-12 text-lg"
                          >
                             {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Salvar Perfil
                          </Button>
                       </CardContent>
                    </Card>
                 )}

                 <Card className={`border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 transition-all ${isChangingPassword ? 'bg-blue-50 dark:bg-blue-900/10 ring-blue-200 dark:ring-blue-800' : 'bg-white dark:bg-slate-900'}`}>
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
                                  <div className="relative">
                                    <Input 
                                      id="current_password" 
                                      type={showCurrentPassword ? "text" : "password"} 
                                      {...registerPassword('current_password')} 
                                      className="bg-white dark:bg-slate-950 pr-10" 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  {passwordErrors.current_password && <span className="text-xs text-red-500">{passwordErrors.current_password.message}</span>}
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="new_password">Nova Senha</Label>
                                  <div className="relative">
                                    <Input 
                                      id="new_password" 
                                      type={showNewPassword ? "text" : "password"} 
                                      {...registerPassword('new_password')} 
                                      className="bg-white dark:bg-slate-950 pr-10" 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowNewPassword(!showNewPassword)}
                                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  {passwordErrors.new_password && <span className="text-xs text-red-500">{passwordErrors.new_password.message}</span>}
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="new_password_confirmation">Confirmar Nova Senha</Label>
                                  <div className="relative">
                                    <Input 
                                      id="new_password_confirmation" 
                                      type={showConfirmPassword ? "text" : "password"} 
                                      {...registerPassword('new_password_confirmation')} 
                                      className="bg-white dark:bg-slate-950 pr-10" 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  {passwordErrors.new_password_confirmation && <span className="text-xs text-red-500">{passwordErrors.new_password_confirmation.message}</span>}
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={isSubmittingPassword} className="flex-1 bg-primary hover:bg-blue-700 text-white">
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
