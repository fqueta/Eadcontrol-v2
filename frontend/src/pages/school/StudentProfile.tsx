import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle, KeyRound, MapPin, User as UserIcon, Loader2, Camera, Phone, Calendar, Briefcase, GraduationCap } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { getTenantApiUrl, mascaraCpf } from '@/lib/qlib';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import { cepApplyMask, cepRemoveMask } from '@/lib/masks/cep-apply-mask';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const profileSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  celular: z.string().optional(),
  cpf: z.string().optional(),
  genero: z.string().optional(),
  config: z.object({
    nascimento: z.string().optional(),
    rg: z.string().optional(),
    escolaridade: z.string().optional(),
    profissao: z.string().optional(),
    observacoes: z.string().optional(),
  }).optional(),
});

const addressSchema = z.object({
  config: z.object({
    cep: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().optional(),
  }),
});

const securitySchema = z.object({
  current_password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  new_password: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres." }),
  new_password_confirmation: z.string().min(6, { message: "A confirmação deve ter pelo menos 6 caracteres." }),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "As senhas não coincidem.",
  path: ["new_password_confirmation"],
});

export default function StudentProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const s = String(user?.name || '').trim();
    if (!s) return 'AL';
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? 'L' : (parts[0]?.[1] ?? 'L');
    return `${first}${last}`.toUpperCase();
  }, [user?.name]);

  const userPhoto = useMemo(() => {
    let path = (user as any)?.foto_perfil || user?.avatar; 
    if (user?.avatar_url && user.avatar_url.startsWith('http')) return user.avatar_url;
    if (path) {
        if (path.startsWith('http')) return path;
        path = path.replace(/^\//, '');
        if (path.startsWith('storage/')) path = path.replace('storage/', '');
        const baseUrl = getTenantApiUrl().replace('/api', '');
        const timestamp = user?.updated_at ? `?t=${new Date(user.updated_at).getTime()}` : '';
        return `${baseUrl}/storage/${path}${timestamp}`;
    }
    return undefined;
  }, [user]);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      celular: user?.celular || '',
      cpf: user?.cpf || '',
      genero: user?.genero || '',
      config: {
        nascimento: user?.config?.nascimento || '',
        rg: user?.config?.rg || '',
        escolaridade: user?.config?.escolaridade || '',
        profissao: user?.config?.profissao || '',
        observacoes: user?.config?.observacoes || '',
      },
    },
  });

  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      config: {
        cep: user?.config?.cep || '',
        endereco: user?.config?.endereco || '',
        numero: user?.config?.numero || '',
        complemento: user?.config?.complemento || '',
        bairro: user?.config?.bairro || '',
        cidade: user?.config?.cidade || '',
        uf: user?.config?.uf || '',
      },
    },
  });

  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  // Update forms when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || '',
        celular: user.celular || '',
        cpf: user.cpf || '',
        genero: user.genero || '',
        config: {
          nascimento: user.config?.nascimento || '',
          rg: user.config?.rg || '',
          escolaridade: user.config?.escolaridade || '',
          profissao: user.config?.profissao || '',
          observacoes: user.config?.observacoes || '',
        },
      });
      addressForm.reset({
        config: {
          cep: user.config?.cep || '',
          endereco: user.config?.endereco || '',
          numero: user.config?.numero || '',
          complemento: user.config?.complemento || '',
          bairro: user.config?.bairro || '',
          cidade: user.config?.cidade || '',
          uf: user.config?.uf || '',
        },
      });
    }
  }, [user, profileForm, addressForm]);

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsUpdatingProfile(true);
    const success = await updateProfile(values);
    if (success) toast.success('Perfil atualizado com sucesso!');
    setIsUpdatingProfile(false);
  }

  async function onAddressSubmit(values: z.infer<typeof addressSchema>) {
    setIsUpdatingAddress(true);
    const success = await updateProfile(values);
    if (success) toast.success('Endereço atualizado com sucesso!');
    setIsUpdatingAddress(false);
  }

  async function onSecuritySubmit(values: z.infer<typeof securitySchema>) {
    setIsChangingPassword(true);
    const success = await changePassword(values);
    if (success) securityForm.reset();
    setIsChangingPassword(false);
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        toast.error('Selecione uma imagem válida.');
        return;
    }
    try {
        setUploading(true);
        const formData = new FormData();
        formData.append('foto_perfil', file);
        formData.append('name', user?.name || ''); 
        const success = await updateProfile(formData);
        if (success) toast.success('Foto atualizada com sucesso!');
        if (e.target) e.target.value = '';
    } catch (error) {
        toast.error('Erro ao enviar foto.');
    } finally {
        setUploading(false);
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cepRemoveMask(cep);
    if (cleanCep.length !== 8) return;
    try {
      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        addressForm.setValue('config.endereco', data.logradouro);
        addressForm.setValue('config.bairro', data.bairro);
        addressForm.setValue('config.cidade', data.localidade);
        addressForm.setValue('config.uf', data.uf);
        toast.success('Endereço preenchido!');
      }
    } catch (error) {
      console.error('Erro CEP', error);
    } finally {
      setLoadingCep(false);
    }
  };

  return (
    <InclusiveSiteLayout>
      <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src={userPhoto} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold bg-primary/5 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{user?.name}</h1>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
              <UserCircle className="h-4 w-4" /> Aluno
            </p>
          </div>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> <span className="hidden md:inline">Dados Pessoais</span><span className="md:hidden">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> <span className="hidden md:inline">Endereço</span><span className="md:hidden">Local</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> <span className="hidden md:inline">Segurança</span><span className="md:hidden">Acesso</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>Mantenha seus dados sempre atualizados.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input value={user?.email || ''} readOnly className="bg-muted opacity-70" />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="celular"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Celular / WhatsApp</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                                placeholder="(00) 00000-0000"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                onChange={(e) => field.onChange(mascaraCpf(e.target.value))}
                                placeholder="000.000.000-00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                      <FormField
                        control={profileForm.control}
                        name="config.nascimento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Nascimento</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="genero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gênero</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="m">Masculino</SelectItem>
                                <SelectItem value="f">Feminino</SelectItem>
                                <SelectItem value="ni">Prefiro não informar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="config.escolaridade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Escolaridade</FormLabel>
                            <FormControl><Input placeholder="Ex: Ensino Superior" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="config.profissao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Profissão</FormLabel>
                            <FormControl><Input placeholder="Sua profissão" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="config.observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio / Observações</FormLabel>
                          <FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isUpdatingProfile} className="w-full md:w-auto px-8">
                      {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Dados Pessoais
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address" className="space-y-6">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle>Endereço de Cobrança / Contato</CardTitle>
                <CardDescription>Essas informações são usadas para faturamento e suporte.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...addressForm}>
                  <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={addressForm.control}
                        name="config.cep"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  {...field} 
                                  onChange={(e) => {
                                    const val = cepApplyMask(e.target.value);
                                    field.onChange(val);
                                    if (val.length === 9) fetchAddressByCep(val);
                                  }}
                                  placeholder="00000-000"
                                />
                                {loadingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addressForm.control}
                        name="config.endereco"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Logradouro</FormLabel>
                            <FormControl><Input placeholder="Rua, Avenida, etc" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addressForm.control}
                        name="config.numero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addressForm.control}
                        name="config.complemento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl><Input placeholder="Apto, Sala, Bloco" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addressForm.control}
                        name="config.bairro"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addressForm.control}
                        name="config.cidade"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Cidade</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addressForm.control}
                        name="config.uf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado (UF)</FormLabel>
                            <FormControl><Input maxLength={2} placeholder="UF" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" disabled={isUpdatingAddress} className="w-full md:w-auto px-8">
                      {isUpdatingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Endereço
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Recomendamos trocar sua senha a cada 3 meses.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                    <div className="max-w-md space-y-4">
                      <FormField
                        control={securityForm.control}
                        name="current_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={securityForm.control}
                        name="new_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={securityForm.control}
                        name="new_password_confirmation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" disabled={isChangingPassword} variant="destructive" className="w-full md:w-auto">
                      {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Atualizar Senha de Acesso
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </InclusiveSiteLayout>
  );
}
