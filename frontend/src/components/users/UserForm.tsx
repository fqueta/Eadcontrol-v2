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
import { Eye, EyeOff } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
}

/**
 * Estrutura de dados do formulário de usuário
 * User form data structure used by react-hook-form
 */
interface UserFormData {
  name: string;
  email: string;
  permission_id: string;
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
  };
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
 *        Use `showAddressSection` para ocultar a seção de endereço quando necessário.
 * en-US: Shared user form for create/edit flows with configurable field visibility.
 *        Use `showAddressSection` to hide the address section when needed.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                  <FormLabel>Tipo de Pessoa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
          <FormField
            control={form.control}
            name="permission_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissão</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPermissions}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPermissions ? "Carregando..." : "Selecione a permissão"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[60]">
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
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha (min. 6 caracteres)"
                      {...field}
                      value={field.value ?? ''}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {showGenero && (
            <FormField
              control={form.control}
              name="genero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gênero" />
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
          <FormField
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ativo</FormLabel>
                {ativoAsSwitch ? (
                  <FormControl>
                    <Switch
                      checked={field.value === 's'}
                      onCheckedChange={(checked) => field.onChange(checked ? 's' : 'n')}
                    />
                  </FormControl>
                ) : (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="s">Sim</SelectItem>
                      <SelectItem value="n">Não</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('tipo_pessoa') === 'pf' && (
            showCpf ? (
              <SmartDocumentInput
                name="cpf"
                control={form.control}
                label="CPF"
                tipoPessoa="pf"
                placeholder="000.000.000-00"
              />
            ) : null
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
                      <Input placeholder="Razão social da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          {showPhones && (
            <>
              {/* Celular com máscara DDI */}
              <FormField
                control={form.control}
                name="config.celular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                        placeholder="+55 (11) 99999-9999"
                        disabled={isLoadingPermissions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Telefone comercial com máscara DDI */}
              <FormField
                control={form.control}
                name="config.telefone_comercial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                        placeholder="+55 (11) 3333-4444"
                        disabled={isLoadingPermissions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          {showBirthDate && (
            <FormField
              control={form.control}
              name="config.nascimento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {showAddressSection && <AddressAccordion form={form} />}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleOnclick}
            disabled={isLoadingPermissions}
          >
            {editingUser ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}