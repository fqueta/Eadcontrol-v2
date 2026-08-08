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
 * useCertificateTemplateForEnrollment
 * pt-BR: Hook para obter o modelo de certificado resolvido para uma matrícula.
 * en-US: Hook to fetch the certificate template resolved for an enrollment.
 */
export function useCertificateTemplateForEnrollment(enrollmentId?: string | number | null, options?: any) {
  return useQuery({
    queryKey: ['certificate-template', 'enrollment', String(enrollmentId || '')],
    queryFn: () => certificatesService.getTemplateForEnrollment(String(enrollmentId)),
    enabled: Boolean(enrollmentId) && !Number.isNaN(Number(enrollmentId)),
    ...(options || {}),
  });
}

/**
 * useCertificateModels
 * pt-BR: Hook para obter todos os modelos de certificado.
 * en-US: Hook to fetch all certificate models.
 */
export function useCertificateModels(options?: any) {
  return useQuery({
    queryKey: ['certificate-models'],
    queryFn: () => certificatesService.getModels(),
    ...(options || {}),
  });
}

/**
 * useCreateCertificateModel
 * pt-BR: Hook para criar um modelo de certificado.
 * en-US: Hook to create a certificate model.
 */
export function useCreateCertificateModel(options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => certificatesService.createModel(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-models'] });
      qc.invalidateQueries({ queryKey: ['certificate-template'] });
    },
    ...(options || {}),
  });
}

/**
 * useUpdateCertificateModel
 * pt-BR: Hook para atualizar um modelo de certificado.
 * en-US: Hook to update a certificate model.
 */
export function useUpdateCertificateModel(options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: any) => certificatesService.updateModel(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-models'] });
      qc.invalidateQueries({ queryKey: ['certificate-template'] });
    },
    ...(options || {}),
  });
}

/**
 * useDeleteCertificateModel
 * pt-BR: Hook para excluir um modelo de certificado.
 * en-US: Hook to delete a certificate model.
 */
export function useDeleteCertificateModel(options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: any) => certificatesService.deleteModel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-models'] });
      qc.invalidateQueries({ queryKey: ['certificate-template'] });
    },
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
 * useCertificateBackgrounds
 * pt-BR: Hook para obter a galeria de imagens de fundo de certificados.
 * en-US: Hook to fetch the certificate background gallery.
 */
export function useCertificateBackgrounds(options?: any) {
  return useQuery({
    queryKey: ['certificate-backgrounds'],
    queryFn: () => certificatesService.getBackgrounds(),
    ...(options || {}),
  });
}

/**
 * useCreateCertificateBackground
 * pt-BR: Hook para adicionar uma imagem de fundo à galeria.
 * en-US: Hook to add a background image to the gallery.
 */
export function useCreateCertificateBackground(options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => certificatesService.createBackground(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-backgrounds'] });
    },
    ...(options || {}),
  });
}

/**
 * useDeleteCertificateBackground
 * pt-BR: Hook para remover uma imagem de fundo da galeria.
 * en-US: Hook to remove a background image from the gallery.
 */
export function useDeleteCertificateBackground(options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: any) => certificatesService.deleteBackground(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificate-backgrounds'] });
    },
    ...(options || {}),
  });
}

/**
 * useValidateCertificate
 * pt-BR: Hook para validar certificado por matrícula.
 * en-US: Hook to validate certificate by enrollment id.
 */
export function useValidateCertificate(enrollmentId: string | number, hash?: string, options?: any) {
  return useQuery({
    queryKey: ['certificate-validate', String(enrollmentId || ''), String(hash || '')],
    queryFn: () => certificatesService.validateCertificate(enrollmentId, hash),
    enabled: Boolean(enrollmentId) && Boolean(hash),
    ...(options || {}),
  });
}