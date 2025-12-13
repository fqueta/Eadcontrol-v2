import { certificatesService } from '@/services/certificatesService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * useCertificateTemplate
 * pt-BR: Hook para obter o modelo de certificado.
 * en-US: Hook to fetch certificate template.
 */
export function useCertificateTemplate(options?: any) {
  return useQuery({
    queryKey: ['certificate-template'],
    queryFn: () => certificatesService.getTemplate(),
    ...(options || {}),
  });
}

/**
 * useSaveCertificateTemplate
 * pt-BR: Hook para salvar o modelo de certificado.
 * en-US: Hook to save certificate template.
 */
export function useSaveCertificateTemplate(options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => certificatesService.saveTemplate(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-template'] });
    },
    ...(options || {}),
  });
}

/**
 * useValidateCertificate
 * pt-BR: Hook para validar certificado por matrícula.
 * en-US: Hook to validate certificate by enrollment id.
 */
export function useValidateCertificate(enrollmentId: string | number, options?: any) {
  return useQuery({
    queryKey: ['certificate-validate', String(enrollmentId || '')],
    queryFn: () => certificatesService.validateCertificate(enrollmentId),
    enabled: Boolean(enrollmentId),
    ...(options || {}),
  });
}