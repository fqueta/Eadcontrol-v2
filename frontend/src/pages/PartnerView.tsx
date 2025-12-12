import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, User, Building, Calendar, GraduationCap, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePartner } from '@/hooks/partners';
import { phoneApplyMask, phoneRemoveMask } from '@/lib/masks/phone-apply-mask';
import { PartnerRecord } from '@/types/partners';

/**
 * Formata CPF para exibição
 */
function formatCPF(cpf: string | null): string {
  if (!cpf) return 'Não informado';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ para exibição
 */
function formatCNPJ(cnpj: string | null): string {
  if (!cnpj) return 'Não informado';
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata telefone para exibição
 */
function formatPhone(phone: string): string {
  const cleaned = phoneRemoveMask(phone || '');
  const masked = phoneApplyMask(cleaned);
  return masked || 'Não informado';
}

/**
 * Formata CEP para exibição
 */
function formatCEP(cep: string): string {
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata data para exibição
 */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
}

/**
 * Página de visualização detalhada de um parceiro específico
 * Exibe todas as informações do cadastro do parceiro de forma organizada
 */
export default function PartnerView() {
  const link_admin:string = 'admin';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: partner, isLoading, error } = usePartner(id!);

  /**
   * Navega de volta para a listagem de parceiros
   */
  const handleBack = () => {
    navigate(`/${link_admin}/partners`);
  };

  /**
   * Navega para a página de edição do parceiro
   */
  const handleEdit = () => {
    navigate(`/${link_admin}/partners/${id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando informações do parceiro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Erro ao carregar parceiro</h2>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Não foi possível carregar as informações do parceiro.'}
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para listagem
          </Button>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Parceiro não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O parceiro solicitado não foi encontrado.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para listagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{partner.name}</h1>
            <p className="text-muted-foreground">
              {partner.tipo_pessoa === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={partner.ativo === 's' ? 'default' : 'destructive'}>
            {partner.ativo === 's' ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button onClick={handleEdit} size="sm">
            Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-sm">{partner.name || 'Não informado'}</p>
            </div>
            
            {partner.tipo_pessoa === 'pj' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                <p className="text-sm">{partner.razao || 'Não informado'}</p>
              </div>
            )}
            
            {partner.config?.nome_fantasia && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Fantasia</label>
                <p className="text-sm">{partner.config.nome_fantasia}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Documento</label>
              <p className="text-sm">
                {partner.tipo_pessoa === 'pf' 
                  ? formatCPF(partner.cpf) 
                  : formatCNPJ(partner.cnpj)
                }
              </p>
            </div>

            {partner.config?.rg && partner.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">RG</label>
                <p className="text-sm">{partner.config.rg}</p>
              </div>
            )}

            {partner.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                <p className="text-sm">
                  {partner.genero === 'm' ? 'Masculino' : 
                   partner.genero === 'f' ? 'Feminino' : 'Não informado'}
                </p>
              </div>
            )}

            {partner.config?.nascimento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <p className="text-sm">{formatDate(partner.config.nascimento)}</p>
              </div>
            )}

            {partner.config?.tipo_pj && partner.tipo_pessoa === 'pj' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Pessoa Jurídica</label>
                <p className="text-sm">{partner.config.tipo_pj}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                {partner.email || 'Não informado'}
              </p>
            </div>

            {partner.config?.celular && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Celular</label>
                <p className="text-sm flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  {formatPhone(partner.config.celular)}
                </p>
              </div>
            )}

            {partner.config?.telefone_residencial && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone Residencial</label>
                <p className="text-sm flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  {formatPhone(partner.config.telefone_residencial)}
                </p>
              </div>
            )}

            {partner.config?.telefone_comercial && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone Comercial</label>
                <p className="text-sm flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  {formatPhone(partner.config.telefone_comercial)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {partner.config?.cep && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">CEP</label>
                <p className="text-sm">{formatCEP(partner.config.cep)}</p>
              </div>
            )}

            {partner.config?.endereco && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                <p className="text-sm">
                  {partner.config.endereco}
                  {partner.config?.numero && `, ${partner.config.numero}`}
                </p>
              </div>
            )}

            {partner.config?.complemento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Complemento</label>
                <p className="text-sm">{partner.config.complemento}</p>
              </div>
            )}

            {partner.config?.bairro && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                <p className="text-sm">{partner.config.bairro}</p>
              </div>
            )}

            {(partner.config?.cidade || partner.config?.uf) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cidade/UF</label>
                <p className="text-sm">
                  {partner.config?.cidade && partner.config?.uf 
                    ? `${partner.config.cidade}, ${partner.config.uf}`
                    : partner.config?.cidade || partner.config?.uf || 'Não informado'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Profissionais/Acadêmicas */}
        {(partner.config?.escolaridade || partner.config?.profissao) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {partner.config?.escolaridade && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Escolaridade</label>
                  <p className="text-sm flex items-center">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    {partner.config.escolaridade}
                  </p>
                </div>
              )}

              {partner.config?.profissao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                  <p className="text-sm flex items-center">
                    <Briefcase className="mr-2 h-4 w-4" />
                    {partner.config.profissao}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Observações */}
      {partner.config?.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{partner.config.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {partner.created_at && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
              <p className="text-sm">{formatDate(partner.created_at)}</p>
            </div>
          )}

          {partner.updated_at && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
              <p className="text-sm">{formatDate(partner.updated_at)}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground">ID do Parceiro</label>
            <p className="text-sm font-mono">{partner.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}