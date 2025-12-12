import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { CreatePartnerInput } from '@/types/partners';

interface PartnerFormProps {
  form: UseFormReturn<CreatePartnerInput>;
  isLoading?: boolean;
}

/**
 * Componente de formulário para criação e edição de parceiros
 * Reutiliza a estrutura do ClientForm adaptada para partners
 */
export function PartnerForm({ form, isLoading = false }: PartnerFormProps) {
  const { register, formState: { errors }, watch, setValue } = form;
  const tipoPessoa = watch('tipo_pessoa');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Tipo de Pessoa */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Pessoa</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={tipoPessoa}
            onValueChange={(value) => setValue('tipo_pessoa', value as 'pf' | 'pj')}
            className="flex space-x-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pf" id="pf" />
              <Label htmlFor="pf">Pessoa Física</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pj" id="pj" />
              <Label htmlFor="pj">Pessoa Jurídica</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Dados Básicos */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Básicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register('name')}
                disabled={isLoading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

          </div>
          <div className="grid grid-cols-1">
            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  disabled={isLoading}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          {tipoPessoa === 'pf' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  {...register('cpf')}
                  disabled={isLoading}
                  className={errors.cpf ? 'border-red-500' : ''}
                />
                {errors.cpf && (
                  <p className="text-sm text-red-500 mt-1">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="genero">Gênero</Label>
                <Select
                  value={watch('genero')}
                  onValueChange={(value) => setValue('genero', value as 'm' | 'f' | 'ni')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Masculino</SelectItem>
                    <SelectItem value="f">Feminino</SelectItem>
                    <SelectItem value="ni">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  {...register('cnpj')}
                  disabled={isLoading}
                  className={errors.cnpj ? 'border-red-500' : ''}
                />
                {errors.cnpj && (
                  <p className="text-sm text-red-500 mt-1">{errors.cnpj.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="razao">Razão Social</Label>
                <Input
                  id="razao"
                  {...register('razao')}
                  disabled={isLoading}
                  className={errors.razao ? 'border-red-500' : ''}
                />
                {errors.razao && (
                  <p className="text-sm text-red-500 mt-1">{errors.razao.message}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="ativo">Status</Label>
            <Select
              value={watch('ativo')}
              onValueChange={(value) => setValue('ativo', value as 's' | 'n')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="s">Ativo</SelectItem>
                <SelectItem value="n">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Complementares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="config.nome_fantasia">Nome Fantasia</Label>
              <Input
                id="config.nome_fantasia"
                {...register('config.nome_fantasia')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.celular">Celular</Label>
              <Input
                id="config.celular"
                {...register('config.celular')}
                onChange={(e) => {
                  const masked = phoneApplyMask(e.target.value);
                  // Atualiza valor mascarado mantendo compatibilidade com register
                  (e.target as HTMLInputElement).value = masked;
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="config.telefone_residencial">Telefone Residencial</Label>
              <Input
                id="config.telefone_residencial"
                {...register('config.telefone_residencial')}
                onChange={(e) => {
                  const masked = phoneApplyMask(e.target.value);
                  (e.target as HTMLInputElement).value = masked;
                }}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.telefone_comercial">Telefone Comercial</Label>
              <Input
                id="config.telefone_comercial"
                {...register('config.telefone_comercial')}
                onChange={(e) => {
                  const masked = phoneApplyMask(e.target.value);
                  (e.target as HTMLInputElement).value = masked;
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="config.rg">RG</Label>
              <Input
                id="config.rg"
                {...register('config.rg')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.nascimento">Data de Nascimento</Label>
              <Input
                id="config.nascimento"
                type="date"
                {...register('config.nascimento')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.escolaridade">Escolaridade</Label>
              <Input
                id="config.escolaridade"
                {...register('config.escolaridade')}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="config.profissao">Profissão</Label>
              <Input
                id="config.profissao"
                {...register('config.profissao')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.tipo_pj">Tipo PJ</Label>
              <Input
                id="config.tipo_pj"
                {...register('config.tipo_pj')}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="config.observacoes">Observações</Label>
            <Textarea
              id="config.observacoes"
              {...register('config.observacoes')}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="config.cep">CEP</Label>
              <Input
                id="config.cep"
                {...register('config.cep')}
                disabled={isLoading}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="config.endereco">Endereço</Label>
              <Input
                id="config.endereco"
                {...register('config.endereco')}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="config.numero">Número</Label>
              <Input
                id="config.numero"
                {...register('config.numero')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.complemento">Complemento</Label>
              <Input
                id="config.complemento"
                {...register('config.complemento')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.bairro">Bairro</Label>
              <Input
                id="config.bairro"
                {...register('config.bairro')}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="config.cidade">Cidade</Label>
              <Input
                id="config.cidade"
                {...register('config.cidade')}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="config.uf">UF</Label>
              <Input
                id="config.uf"
                {...register('config.uf')}
                disabled={isLoading}
                maxLength={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}