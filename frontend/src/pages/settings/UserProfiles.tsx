import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/authService';
import { useCep } from '@/hooks/useCep';
import { cepApplyMask, cepRemoveMask } from '@/lib/masks/cep-apply-mask';
import { cpfApplyMask } from '@/lib/masks/cpf-apply-mask';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';

/**
 * formatDisplayPhone
 * pt-BR: Aplica máscara de telefone para exibição; retorna "Não informado" se vazio.
 * en-US: Applies phone mask for display; returns "Não informado" if empty.
 */
const formatDisplayPhone = (value?: string) => {
  const digits = (value || '').replace(/\D/g, '');
  return digits ? phoneApplyMask(digits) : 'Não informado';
};

/**
 * formatDisplayCpf
 * pt-BR: Aplica máscara de CPF para exibição; retorna "Não informado" se vazio.
 * en-US: Applies CPF mask for display; returns "Não informado" if empty.
 */
const formatDisplayCpf = (value?: string) => {
  const digits = (value || '').replace(/\D/g, '');
  return digits ? cpfApplyMask(digits) : 'Não informado';
};

/**
 * formatDisplayCep
 * pt-BR: Aplica máscara de CEP para exibição; retorna "Não informado" se vazio.
 * en-US: Applies CEP mask for display; returns "Não informado" if empty.
 */
const formatDisplayCep = (value?: string) => {
  const digits = (value || '').replace(/\D/g, '');
  return digits ? cepApplyMask(digits) : 'Não informado';
};

/**
 * displayOrUnknown
 * pt-BR: Retorna o texto se for string não vazia; senão "Não informado".
 * en-US: Returns text if non-empty string; otherwise "Não informado".
 */
const displayOrUnknown = (value?: unknown) => {
  return typeof value === 'string' && value.trim().length > 0 ? value : 'Não informado';
};

// Schema de validação do perfil (alinhado ao ClientArea)
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

// Schema de validacao para alteracao de senha
const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Senha atual e obrigatoria'),
  new_password: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  new_password_confirmation: z.string().min(1, 'Confirmacao de senha e obrigatoria'),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: 'As senhas nao coincidem',
  path: ['new_password_confirmation'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Componente para gerenciar o perfil do usuario
 * Permite edicao de informacoes pessoais, upload de avatar e alteracao de senha
 */
const UserProfiles: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileFormData | null>(null);

  // ViaCEP helpers
  const { fetchCep, isValidCep, clearAddressData } = useCep();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirmation, setShowNewPasswordConfirmation] = useState(false);

  // Form para edicao do perfil
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    getValues,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone ? phoneApplyMask(user.phone) : '',
      company: user?.company || '',
      cpf: user?.cpf ? cpfApplyMask(user.cpf.replace(/\D/g, '')) : user?.cpf || '',
      birth_date: user?.birth_date || '',
      gender: user?.gender || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zip_code: user?.zip_code ? cepApplyMask(user.zip_code) : '',
    },
  });

  // Form para alteracao de senha
  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  /**
   * handleSubmit profile
   * pt-BR: Sanitiza telefone/CEP e exclui e-mail/CPF do payload antes de enviar.
   * en-US: Sanitizes phone/CEP and excludes email/CPF from payload before sending.
   */
  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { email: _email, cpf: _cpf, ...editableProfile } = data;
      const payload = {
        ...editableProfile,
        phone: editableProfile.phone ? phoneRemoveMask(editableProfile.phone) : '',
        zip_code: editableProfile.zip_code ? cepRemoveMask(editableProfile.zip_code) : '',
      };
      await updateProfile(payload);
      setIsEditing(false);
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Funcao para submeter a alteracao de senha
   */
  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    setIsChangingPassword(true);
    try {
      const success = await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation,
      });
      
      if (success) {
        setIsChangePasswordOpen(false);
        passwordForm.reset();
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowNewPasswordConfirmation(false);
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * handleCancelEdit
   * pt-BR: Restaura os dados do formulário a partir do snapshot atual.
   * en-US: Restores form data from current snapshot when canceling.
  */
  const handleCancelEdit = () => {
    // pt-BR: Primeiro restaura o snapshot pré-edição, depois sai do modo de edição.
    // en-US: Restore pre-edit snapshot first, then exit edit mode.
    if (profileSnapshot) {
      reset(profileSnapshot);
    } else {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone ? phoneApplyMask(user.phone) : '',
        company: user?.company || '',
        cpf: user?.cpf ? cpfApplyMask(user.cpf.replace(/\D/g, '')) : user?.cpf || '',
        birth_date: user?.birth_date || '',
        gender: user?.gender || '',
        address: user?.address || '',
        city: user?.city || '',
        state: user?.state || '',
        zip_code: user?.zip_code ? cepApplyMask(user.zip_code) : '',
      });
    }
    setIsEditing(false);
  };

  /**
   * handlePhoneChange
   * pt-BR: Aplica máscara de telefone conforme o usuário digita.
   * en-US: Applies phone mask as the user types.
   */
  const handlePhoneChange = (value: string) => {
    const masked = phoneApplyMask(value);
    setValue('phone', masked, { shouldValidate: true });
  };

  /**
   * handleCepChange
   * pt-BR: Aplica máscara ao CEP e preenche endereço via ViaCEP se válido.
   * en-US: Masks CEP and auto-fills address via ViaCEP if valid.
   */
  const handleCepChange = async (value: string) => {
    const masked = cepApplyMask(value);
    setValue('zip_code', masked, { shouldValidate: true });

    if (isValidCep(masked)) {
      try {
        const addr = await fetchCep(masked);
        if (addr) {
          setValue('address', addr.endereco || '');
          setValue('city', addr.cidade || '');
          setValue('state', addr.uf || '');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    } else {
      clearAddressData?.();
    }
  };

  /**
   * useEffect: Carrega metadados do perfil para preencher endereço/cidade/estado/CEP
   * pt-BR: Busca dados do perfil no backend e aplica máscaras para exibição.
   * en-US: Fetches profile meta from backend and applies masks for display.
   */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await authService.getProfile();
        const meta = profile?.meta || {} as Record<string, unknown>;

        const current = getValues();
        const str = (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v : '');

        reset({
          ...current,
          name: typeof profile?.name === 'string' ? profile.name : current.name,
          email: typeof profile?.email === 'string' ? profile.email : current.email,
          phone: str(meta.phone) ? phoneApplyMask(String(meta.phone)) : current.phone,
          company: str(meta.company) || current.company,
          birth_date: str(meta.birth_date) || current.birth_date,
          gender: str(meta.gender) || current.gender,
          address: str(meta.address) || current.address,
          city: str(meta.city) || current.city,
          state: str(meta.state) || current.state,
          zip_code: str(meta.zip_code) ? cepApplyMask(String(meta.zip_code)) : current.zip_code,
          cpf: current.cpf,
        });
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Funcao para fechar o modal de alteracao de senha
   */
  const handleClosePasswordModal = () => {
    setIsChangePasswordOpen(false);
    passwordForm.reset();
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowNewPasswordConfirmation(false);
  };



  /**
   * Funcao para obter as iniciais do usuario
   */
  const getUserInitials = (name?: string) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-100">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informacoes pessoais e configuracoes de conta</p>
      </div>

      <div className="grid gap-6">
        {/* Card do Perfil */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informacoes Pessoais</CardTitle>
                <CardDescription>Atualize suas informacoes pessoais</CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => { setProfileSnapshot(getValues()); setIsEditing(true); }} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={user.avatar_url || ''} 
                      alt={user.name || 'Usuario'} 
                    />
                    <AvatarFallback className="text-lg">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user.name || 'Usuario'}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Campos do formulario */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email * (não editável)</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    disabled
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      {...register('phone')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="(11) 99999-9999"
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {formatDisplayPhone(getValues('phone') || user?.phone)}
                    </p>
                  )}
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>


                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  {isEditing ? (
                    <Input
                      id="company"
                      {...register('company')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="Nome da empresa"
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {displayOrUnknown(getValues('company'))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (não editável)</Label>
                  <p className="text-sm text-foreground">
                    {formatDisplayCpf(getValues('cpf') || user?.cpf)}
                  </p>
                  <p className="text-xs text-gray-500">Seu CPF não pode ser alterado.</p>
                </div>

                {/* CEP posicionado imediatamente após CPF para facilitar o autocomplete */}
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  {isEditing ? (
                    <Input
                      id="zip_code"
                      {...register('zip_code')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="Digite seu CEP"
                      onChange={(e) => handleCepChange(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {formatDisplayCep(getValues('zip_code') || user?.zip_code)}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      {...register('address')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="Rua, número, complemento"
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {displayOrUnknown(getValues('address'))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  {isEditing ? (
                    <Input
                      id="city"
                      {...register('city')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {displayOrUnknown(getValues('city'))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  {isEditing ? (
                    <Input
                      id="state"
                      {...register('state')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {displayOrUnknown(getValues('state'))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  {isEditing ? (
                    <Input
                      id="birth_date"
                      type="date"
                      {...register('birth_date')}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  ) : (
                    <p className="text-sm text-foreground">
                      {displayOrUnknown(getValues('birth_date'))}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  {isEditing ? (
                    // pt-BR: Usa select com opções iguais ao ClientArea.
                    // en-US: Use a select with options matching ClientArea.
                    <select
                      id="gender"
                      {...register('gender')}
                      disabled={!isEditing}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                      <option value="prefiro_nao_informar">Prefiro não informar</option>
                    </select>
                  ) : (
                    <p className="text-sm text-foreground">
                      {displayOrUnknown(getValues('gender'))}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Card de Seguranca */}
        <Card>
          <CardHeader>
            <CardTitle>Seguranca</CardTitle>
            <CardDescription>Gerencie suas configuracoes de seguranca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Senha</h4>
                  <p className="text-sm text-muted-foreground">Altere sua senha de acesso</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangePasswordOpen(true)}
                >
                  Alterar Senha
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Alteracao de Senha */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Senha Atual *</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  {...passwordForm.register('current_password')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.current_password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha *</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  {...passwordForm.register('new_password')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.new_password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password_confirmation">Confirmar Nova Senha *</Label>
              <div className="relative">
                <Input
                  id="new_password_confirmation"
                  type={showNewPasswordConfirmation ? 'text' : 'password'}
                  {...passwordForm.register('new_password_confirmation')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPasswordConfirmation(!showNewPasswordConfirmation)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.new_password_confirmation && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.new_password_confirmation.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClosePasswordModal}
                disabled={isChangingPassword}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfiles;