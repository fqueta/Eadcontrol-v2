import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DialogFooter } from '@/components/ui/dialog';
import { AddressAccordion } from "@/components/lib/AddressAccordion";
import { SmartDocumentInput } from '@/components/lib/SmartDocumentInput';
import { MaskedInputField } from '@/components/lib/MaskedInputField';
import { UseFormReturn } from 'react-hook-form';
import { Eye, EyeOff, User, ShieldCheck, MapPin } from 'lucide-react';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface Permission {
  id: number | string;
  name: string;
}

/**
 * Estrutura de dados do formulário de usuário
 * User form data structure used by react-hook-form
 */
interface UserFormData {
  name?: string;
  email?: string;
  permission_id?: string;
  tipo_pessoa?: 'pf' | 'pj';
  password?: string;
  genero?: 'm' | 'f' | 'ni';
  ativo?: 's' | 'n';
  cpf?: string;
  cnpj?: string;
  razao?: string;
  config?: {
    celular?: string;
    telefone_comercial?: string;
    nascimento?: string;
    force_password_change?: 's' | 'n';
  };
  force_password_change?: 's' | 'n';
}

/**
 * Propriedades do componente UserForm
 * UserForm component props for create/edit flows
 */
interface UserFormProps {
  form: UseFormReturn<UserFormData>;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  editingUser?: UserFormData | null;
  permissions: Permission[];
  isLoadingPermissions: boolean;
  handleOnclick?: () => void;
  /** Controla exibição do campo Tipo de Pessoa | Controls visibility of person type field */
  showTipoPessoa?: boolean;
  /** Controla exibição do campo Gênero | Controls visibility of gender field */
  showGenero?: boolean;
  /** Controla exibição da seção de endereço | Controls visibility of address section */
  showAddressSection?: boolean;
  /** Controla exibição do CPF (PF) | Controls CPF visibility for PF */
  showCpf?: boolean;
  /** Controla exibição dos telefones | Controls phone fields visibility */
  showPhones?: boolean;
  /** Usa Switch para campo Ativo | Use Switch for Active field */
  ativoAsSwitch?: boolean;
  /** Controla exibição de Data de Nascimento | Controls birth date visibility */
  showBirthDate?: boolean;
}

/**
 * Componente de formulário para criação e edição de usuários
 * Suporta tanto pessoa física quanto jurídica com validações específicas
 */
/**
 * UserForm — Formulário compartilhado de usuário
 * pt-BR: Permite criar/editar usuários com campos configuráveis por flags.
 *        Refatorado com abas para melhor organização.
 * en-US: Shared user form for create/edit flows with configurable field visibility.
 *        Refactored with tabs for better organization.
 */
export function UserForm({
  form,
  onSubmit,
  onCancel,
  editingUser,
  permissions,
  isLoadingPermissions,
  handleOnclick,
  showTipoPessoa = true,
  showGenero = true,
  showAddressSection = true,
  showCpf = true,
  showPhones = true,
  ativoAsSwitch = false,
  showBirthDate = true,
}: UserFormProps): React.ReactElement {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Erros de validação:', errors);
        })}
        className="space-y-6"
      >
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Pessoais</span>
              <span className="sm:hidden">Pessoal</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança e Acesso</span>
              <span className="sm:hidden">Acesso</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2" disabled={!showAddressSection}>
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Endereço</span>
              <span className="sm:hidden">Endereço</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card border-none bg-transparent shadow-none>
              <CardContent className="pt-0 px-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="joao@exemplo.com" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showTipoPessoa && (
                  <FormField
                    control={form.control}
                    name="tipo_pessoa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Cadastro</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pf">Pessoa Física</SelectItem>
                            <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('tipo_pessoa') === 'pf' && showCpf && (
                  <SmartDocumentInput
                    name="cpf"
                    control={form.control}
                    label="CPF"
                    tipoPessoa="pf"
                    placeholder="000.000.000-00"
                  />
                )}

                {form.watch('tipo_pessoa') === 'pj' && (
                  <>
                    <SmartDocumentInput
                      name="cnpj"
                      control={form.control}
                      label="CNPJ"
                      tipoPessoa="pj"
                      placeholder="00.000.000/0000-00"
                    />
                    <FormField
                      control={form.control}
                      name="razao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa LTDA" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {showGenero && (
                  <FormField
                    control={form.control}
                    name="genero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="m">Masculino</SelectItem>
                            <SelectItem value="f">Feminino</SelectItem>
                            <SelectItem value="ni">Não Informado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {showBirthDate && (
                  <FormField
                    control={form.control}
                    name="config.nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {showPhones && (
                  <>
                    <FormField
                      control={form.control}
                      name="config.celular"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular / WhatsApp</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                              placeholder="+55 (11) 99999-9999"
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="config.telefone_comercial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone Comercial</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                              placeholder="+55 (11) 3333-4444"
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card border-none bg-transparent shadow-none>
              <CardContent className="pt-0 px-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="permission_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permissão</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value || ""} 
                        disabled={isLoadingPermissions}
                        name="permission_id"
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={isLoadingPermissions ? "Carregando..." : "Selecione a permissão"} />
                        </SelectTrigger>
                        <SelectContent className="z-[70]">
                          {permissions.map((permission) => (
                            <SelectItem key={permission.id} value={String(permission.id)}>
                              {permission.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha de Acesso</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={editingUser ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"}
                            {...field}
                            value={field.value ?? ''}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="force_password_change"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2 bg-amber-50/50 border-amber-100">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-amber-900 font-semibold mb-0">Forçar Troca de Senha</FormLabel>
                        <p className="text-sm text-amber-700">
                          {field.value === 's' ? "O usuário será obrigado a mudar a senha no próximo acesso" : "Fluxo de login normal"}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 's'}
                          onCheckedChange={(checked) => field.onChange(checked ? 's' : 'n')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-zinc-900 font-semibold mb-0">Status do Usuário</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {field.value === 's' ? "Usuário ativo e com acesso ao sistema" : "Usuário desativado e sem login"}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 's'}
                          onCheckedChange={(checked) => field.onChange(checked ? 's' : 'n')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address" className="space-y-4">
            {showAddressSection && (
              <div className="p-4 border rounded-lg bg-zinc-50/50">
                <AddressAccordion form={form} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="px-6 h-11">
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleOnclick}
            disabled={isLoadingPermissions || form.formState.isSubmitting}
            className="px-8 h-11 bg-primary hover:bg-primary/90 transition-all font-medium"
          >
            {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
