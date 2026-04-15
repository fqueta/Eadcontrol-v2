import { useParams, useSearchParams } from 'react-router-dom';
import { useValidateCertificate } from '@/hooks/certificates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck, User, BookOpen, Clock, Calendar } from 'lucide-react';

/**
 * CertificateValidate
 * pt-BR: Página pública simples para validar um certificado por ID de matrícula.
 * en-US: Simple public page to validate a certificate by enrollment ID.
 */
export default function CertificateValidate() {
  const { enrollmentId } = useParams();
  const [searchParams] = useSearchParams();
  const id = String(enrollmentId || '');
  const alunoIdParam = String(searchParams.get('alunoId') || '').trim();

  const { data, isLoading, error } = useValidateCertificate(id, { enabled: !!id });
  const enrollment = (data as any)?.enrollment;

  const hasCertificate = Boolean(enrollment?.preferencias?.certificate_url);
  const isValid = Boolean((data as any)?.valid);
  const alunoIdResp = String(enrollment?.student_id ?? '');
  const alunoMatches = !alunoIdParam || (alunoIdResp && alunoIdResp === alunoIdParam);
  const isValidFinal = isValid && alunoMatches;
  const validatedAt = String((data as any)?.validated_at || '').trim();

  const formatDateBR = (value: string) => {
    if (!value) return '-';
    const iso = value.includes('T') ? value.split('T')[0] : value;
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Validação de Certificado
          </h1>
          <p className="text-sm text-muted-foreground">Confira a autenticidade de um certificado emitido pelo sistema.</p>
        </div>
        <Badge
          variant={isValidFinal ? 'default' : 'destructive'}
          className={isValidFinal ? 'bg-green-500/10 text-green-700 border border-green-500/20' : 'bg-red-500/10 text-red-700 border border-red-500/20'}
        >
          {isValidFinal ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Válido
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Inválido
            </span>
          )}
        </Badge>
      </div>

      {isLoading && (
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Carregando validação...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="rounded-2xl border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600 font-medium">Erro ao validar certificado.</p>
            <p className="text-sm text-muted-foreground mt-1">Verifique o link/QR Code e tente novamente.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base font-bold">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Matrícula</div>
                <div className="font-mono text-sm">{id || '-'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Validado em
                </div>
                <div className="text-sm font-medium">{validatedAt ? formatDateBR(validatedAt) : '-'}</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Aluno
                </div>
                <div className="text-sm font-bold">{String(enrollment?.student_name || '-')}</div>
                {enrollment?.student_email && (
                  <div className="text-xs text-muted-foreground">{String(enrollment?.student_email)}</div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Curso
                </div>
                <div className="text-sm font-bold">{String(enrollment?.course_name || '-')}</div>
                {enrollment?.course_type && (
                  <div className="text-xs text-muted-foreground">Tipo: {String(enrollment?.course_type)}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Carga horária
                </div>
                <div className="text-sm font-medium">{String(enrollment?.hours || '-')}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Conclusão (último acesso)
                </div>
                <div className="text-sm font-medium">{formatDateBR(String(enrollment?.completion_date || ''))}</div>
                {enrollment?.course_completed_at && (
                  <div className="text-xs text-muted-foreground">
                    Conclusão (100%): {formatDateBR(String(enrollment?.course_completed_at || ''))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Status</div>
                <div className="text-sm font-medium">{String(enrollment?.status || '-')}</div>
              </div>
            </div>

            {enrollment?.certificate_issued_at && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Emissão do certificado
                  </div>
                  <div className="text-sm font-medium">{formatDateBR(String(enrollment?.certificate_issued_at || ''))}</div>
                </div>
              </div>
            )}

            {(enrollment?.class_name || enrollment?.consultant_name || enrollment?.situation) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">Turma</div>
                    <div className="text-sm font-medium">{String(enrollment?.class_name || '-')}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">Consultor</div>
                    <div className="text-sm font-medium">{String(enrollment?.consultant_name || '-')}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">Situação</div>
                    <div className="text-sm font-medium">{String(enrollment?.situation || '-')}</div>
                  </div>
                </div>
              </>
            )}

            {!alunoMatches && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                O aluno do link não confere com a matrícula informada.
              </div>
            )}

            {isValidFinal && hasCertificate && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button asChild className="rounded-xl font-bold">
                  <a href={enrollment?.preferencias?.certificate_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir certificado
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
