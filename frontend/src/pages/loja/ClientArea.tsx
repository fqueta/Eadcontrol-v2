import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, History, Settings, Gift, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { useCep } from '@/hooks/useCep';
import { cepApplyMask, cepRemoveMask } from '@/lib/masks/cep-apply-mask';
import { cpfApplyMask } from '@/lib/masks/cpf-apply-mask';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import MyRedemptionsContent from '@/components/loja/MyRedemptionsContent';
import { PointsStoreProps } from '@/types/products';
import { formatPoints } from '@/lib/utils';

/**
 * Componente da área do cliente com abas para perfil, histórico e configurações
 */
const ClientArea: React.FC<PointsStoreProps> = ({ linkLoja }) => {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword } = useAuth();
  
  // Estados para controle das abas e edição
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Verificar se deve abrir uma aba específica baseada nos parâmetros da URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'history', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { fetchCep, isValidCep, clearAddressData } = useCep();
  // Snapshot dos dados atuais exibidos no Perfil para restaurar ao cancelar edição
  const [profileSnapshot, setProfileSnapshot] = useState<any | null>(null);

  /**
   * formatDisplayPhone / formatDisplayCpf / formatDisplayCep
   * pt-BR: Formata valores para exibição no Perfil com máscaras.
   * en-US: Formats values for Profile display using masks.
   */
  const formatDisplayPhone = (value?: string) => {
    const digits = (value || '').replace(/\D/g, '');
    return digits ? phoneApplyMask(digits) : 'Não informado';
  };

  const formatDisplayCpf = (value?: string) => {
    const digits = (value || '').replace(/\D/g, '');
    return digits ? cpfApplyMask(digits) : 'Não informado';
  };

  const formatDisplayCep = (value?: string) => {
    const digits = (value || '').replace(/\D/g, '');
    return digits ? cepApplyMask(digits) : 'Não informado';
  };

  // Estados para edição do perfil
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    company: user?.company || '',
    cpf: user?.cpf || '',
    birth_date: user?.birth_date || '',
    gender: user?.gender || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    zip_code: user?.zip_code || ''
  });
  
  // Estados para alteração de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  /**
   * Função para atualizar o perfil do usuário
   * pt-BR: Restringe alterações de e-mail e CPF (não enviados ao backend).
   * en-US: Restricts changes to email and CPF (excluded from payload).
   */
  const handleUpdateProfile = async () => {
    if (!profileData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // Excluir campos não editáveis e remover máscaras antes de enviar ao backend
      const { email: _email, cpf: _cpf, ...editableProfile } = profileData;
      const payload = {
        ...editableProfile,
        phone: phoneRemoveMask(editableProfile.phone || ''),
        zip_code: cepRemoveMask(editableProfile.zip_code || ''),
      };

      const success = await updateProfile(payload);
      if (success) {
        setIsEditingProfile(false);
        toast({
          title: 'Sucesso',
          description: 'Perfil atualizado com sucesso!',
          variant: 'default'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  /**
   * Função para alterar a senha do usuário
   */
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const success = await changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirmation: passwordData.confirmPassword
      });
      
      if (success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast({
          title: 'Sucesso',
          description: 'Senha alterada com sucesso!',
          variant: 'default'
        });
      }
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      
      // Tratamento específico para erro 422 da API
      let errorMessage = 'Erro ao alterar senha. Verifique a senha atual.';
      
      if (error?.response?.status === 422 && error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  /**
   * handleCancelEdit
   * pt-BR: Cancela a edição e restaura o conteúdo atual exibido no Perfil.
   * en-US: Cancels editing and restores the current Profile display content.
   */
  const handleCancelEdit = () => {
    if (profileSnapshot) {
      setProfileData(profileSnapshot);
    }
    setIsEditingProfile(false);
  };

  /**
   * handlePhoneChange
   * pt-BR: Aplica máscara no telefone conforme o usuário digita.
   * en-US: Applies phone mask as the user types.
   */
  const handlePhoneChange = (value: string) => {
    const masked = phoneApplyMask(value);
    setProfileData({ ...profileData, phone: masked });
  };

  /**
   * handleCepChange
   * pt-BR: Aplica máscara ao CEP e, se válido, busca endereço pela API ViaCEP.
   * en-US: Masks CEP and, if valid, fetches address from ViaCEP API.
   */
  const handleCepChange = async (value: string) => {
    const masked = cepApplyMask(value);
    setProfileData(prev => ({ ...prev, zip_code: masked }));

    // Se for um CEP válido, busca endereço e preenche os campos
    if (isValidCep(masked)) {
      const addr = await fetchCep(masked);
      if (addr) {
        setProfileData(prev => ({
          ...prev,
          address: addr.endereco || prev.address,
          city: addr.cidade || prev.city,
          state: addr.uf || prev.state,
        }));
      }
    } else {
      clearAddressData();
    }
  };

  /**
   * useEffect: Carrega perfil via GET /user/profile
   * pt-BR: Obtém dados de perfil (inclusive meta) e atualiza `profileData`.
   * en-US: Fetches profile (including meta) and updates `profileData`.
   */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await authService.getProfile();
        const meta = data?.meta || {};
        setProfileData(prev => ({
          ...prev,
          name: data?.name ?? prev.name,
          email: data?.email ?? prev.email,
          phone: meta?.phone ?? prev.phone,
          bio: meta?.bio ?? prev.bio,
          company: meta?.company ?? prev.company,
          // CPF não fornecido no endpoint do perfil; mantém o valor existente
          cpf: prev.cpf,
          birth_date: meta?.birth_date ?? prev.birth_date,
          gender: meta?.gender ?? prev.gender,
          address: meta?.address ?? prev.address,
          city: meta?.city ?? prev.city,
          state: meta?.state ?? prev.state,
          zip_code: meta?.zip_code ?? prev.zip_code,
        }));
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar seu perfil.',
          variant: 'destructive',
        });
      }
    };
    loadProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-teal-600 shadow-lg border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(linkLoja)}
                className="text-white hover:text-yellow-300 transition-all transform hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar à Loja
              </Button>
              <h1 className="text-xl font-bold text-white">Área do Cliente</h1>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-yellow-200 text-sm font-medium">Pontos: </span>
              <span className="text-yellow-300 font-bold">
                {user?.points ? formatPoints(Number(user.points)) : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white rounded-xl shadow-lg border-2 border-purple-100">
            <TabsTrigger 
              value="profile" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <User className="w-4 h-4" />
              <span>Perfil</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Perfil */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-green-50 border-b-2 border-purple-100 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-purple-800">
                    <User className="w-5 h-5 text-teal-600" />
                    <span>Informações Pessoais</span>
                  </CardTitle>
                  {!isEditingProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Guardar snapshot do conteúdo atual do Perfil antes de editar
                        setProfileSnapshot(profileData);
                        setIsEditingProfile(true);
                      }}
                      className="border-2 border-purple-300 text-purple-600 hover:bg-purple-50 transition-all transform hover:scale-105"
                    >
                      Editar Perfil
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditingProfile ? (
                  // Visualização do perfil
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Nome Completo</Label>
                          <p className="text-lg font-medium">{profileData?.name || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">E-mail</Label>
                          <p className="text-lg">{profileData?.email || 'Não informado'}</p>
                        </div>
                        <div>
                      <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                      <p className="text-lg">{formatDisplayPhone(profileData?.phone)}</p>
                        </div>
                        <div>
                      <Label className="text-sm font-medium text-gray-500">CPF</Label>
                      <p className="text-lg">{formatDisplayCpf(profileData?.cpf)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Data de Nascimento</Label>
                          <p className="text-lg">{profileData?.birth_date ? new Date(profileData.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Empresa</Label>
                          <p className="text-lg">{profileData?.company || 'Não informado'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Gênero</Label>
                          <p className="text-lg">{profileData?.gender || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                          <p className="text-lg">{profileData?.address || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Cidade</Label>
                          <p className="text-lg">{profileData?.city || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Estado</Label>
                          <p className="text-lg">{profileData?.state || 'Não informado'}</p>
                        </div>
                        <div>
                      <Label className="text-sm font-medium text-gray-500">CEP</Label>
                      <p className="text-lg">{formatDisplayCep(profileData?.zip_code)}</p>
                        </div>
                      </div>
                    </div>
                    {profileData?.bio && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-gray-500">Biografia</Label>
                        <p className="text-lg">{profileData.bio}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Edição do perfil
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          placeholder="Digite seu nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail (não editável)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          placeholder="Digite seu e-mail"
                          disabled
                          title="Este campo não pode ser alterado"
                        />
                        <p className="text-xs text-gray-500">Seu e-mail atual não pode ser alterado.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder="Digite seu telefone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF (não editável)</Label>
                        <Input
                          id="cpf"
                          value={cpfApplyMask((profileData.cpf || '').replace(/\D/g, '')) || profileData.cpf}
                          onChange={() => { /* Campo bloqueado */ }}
                          placeholder="Digite seu CPF"
                          disabled
                          title="Este campo não pode ser alterado"
                        />
                        <p className="text-xs text-gray-500">Seu CPF não pode ser alterado.</p>
                      </div>
                      {/* CEP posicionado imediatamente após CPF para facilitar o autocomplete de endereço */}
                      <div className="space-y-2">
                        <Label htmlFor="zip_code">CEP</Label>
                        <Input
                          id="zip_code"
                          value={profileData.zip_code}
                          onChange={(e) => handleCepChange(e.target.value)}
                          placeholder="Digite seu CEP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth_date">Data de Nascimento</Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={profileData.birth_date}
                          onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gênero</Label>
                        <select
                          id="gender"
                          value={profileData.gender}
                          onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Selecione</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                          <option value="outro">Outro</option>
                          <option value="prefiro_nao_informar">Prefiro não informar</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Empresa</Label>
                        <Input
                          id="company"
                          value={profileData.company}
                          onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                          placeholder="Digite sua empresa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          placeholder="Digite seu endereço"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={profileData.city}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          placeholder="Digite sua cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={profileData.state}
                          onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                          placeholder="Digite seu estado"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografia</Label>
                      <textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        placeholder="Conte um pouco sobre você"
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="flex-1"
                      >
                        {isUpdatingProfile ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isUpdatingProfile}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas do usuário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-teal-100 to-green-100 rounded-xl shadow-md">
                      <Gift className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-600">Pontos Disponíveis</p>
                      <p className="text-2xl font-bold text-purple-800">
                        {user?.points ? formatPoints(Number(user.points)) : '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl shadow-md">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-600">E-mail</p>
                      <p className="text-sm font-medium text-purple-800">{user?.email}</p>
                      <Badge 
                        variant={user?.email_verified_at ? 'default' : 'secondary'} 
                        className={`mt-1 ${user?.email_verified_at 
                          ? 'bg-gradient-to-r from-teal-500 to-green-500 text-white' 
                          : 'bg-gradient-to-r from-orange-400 to-red-400 text-white'
                        }`}
                      >
                        {user?.email_verified_at ? 'Verificado' : 'Não verificado'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl shadow-md">
                      <Calendar className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-600">Membro desde</p>
                      <p className="text-sm font-medium text-orange-600">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Histórico */}
          <TabsContent value="history">
            <MyRedemptionsContent showHeader={false} showStats={true} linkLoja={linkLoja} />
          </TabsContent>

          {/* Aba Configurações */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white rounded-2xl shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-purple-100 rounded-t-2xl">
                <CardTitle className="flex items-center space-x-2 text-purple-800">
                  <Lock className="w-5 h-5 text-orange-600" />
                  <span>Alterar Senha</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-purple-700 font-medium">Senha Atual *</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Digite sua senha atual"
                      className="border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-purple-50 text-purple-600"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-purple-700 font-medium">Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Digite sua nova senha"
                      className="border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-purple-50 text-purple-600"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-purple-700 font-medium">Confirmar Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirme sua nova senha"
                      className="border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-purple-50 text-purple-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 font-medium shadow-md py-3 rounded-lg"
                >
                  {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientArea;