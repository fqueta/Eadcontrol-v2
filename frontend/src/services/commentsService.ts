// pt-BR: Serviço de comentários integrando com rotas do backend.
// en-US: Comments service integrating with backend routes.

import { GenericApiService } from './GenericApiService';

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface CreateCommentPayload {
  // pt-BR: Tipo do alvo do comentário ('course' ou 'activity')
  // en-US: Comment target type ('course' or 'activity')
  target_type: 'course' | 'activity';
  // pt-BR: ID do alvo do comentário
  // en-US: Target entity ID
  target_id: number | string;
  // pt-BR: Texto do comentário
  // en-US: Comment body text
  body: string;
  // pt-BR: Avaliação opcional (1-5)
  // en-US: Optional rating (1-5)
  rating?: number | null;
  // pt-BR: Comentário pai para respostas
  // en-US: Parent comment id for replies
  parent_id?: number | null;
  // pt-BR: Metadados adicionais
  // en-US: Additional metadata
  meta?: Record<string, any> | null;
}

class CommentsService extends GenericApiService {
  /**
   * listForCourse
   * pt-BR: Lista comentários aprovados de um curso (sem duplicar prefixo de versão).
   * en-US: Lists approved comments for a course (avoids duplicating API version prefix).
   */
  listForCourse(courseId: number | string) {
    return this.customGet(`/courses/${courseId}/comments`);
  }

  /**
   * listForActivity
   * pt-BR: Lista comentários aprovados de uma atividade (sem duplicar prefixo de versão).
   * en-US: Lists approved comments for an activity (avoids duplicating API version prefix).
   */
  listForActivity(activityId: number | string) {
    return this.customGet(`/activities/${activityId}/comments`);
  }

  /**
   * createComment
   * pt-BR: Cria novo comentário (status inicial: pending) no endpoint correto.
   * en-US: Creates a new comment (initial status: pending) on the correct endpoint.
   */
  createComment(payload: CreateCommentPayload) {
    return this.customPost(`/comments`, payload);
  }

  /**
   * adminList
   * pt-BR: Lista comentários para moderação (admin) com paginação/filtros.
   * en-US: Lists comments for moderation (admin) with pagination/filters.
   */
  adminList(status?: CommentStatus, page?: number, perPage?: number) {
    const params = new URLSearchParams();
    if (status) params.set('status', String(status));
    if (page && page > 0) params.set('page', String(page));
    if (perPage && perPage > 0) params.set('per_page', String(perPage));
    const qs = params.toString();
    return this.customGet(`/admin/comments${qs ? `?${qs}` : ''}`);
  }

  /**
   * adminApprove
   * pt-BR: Aprova comentário.
   * en-US: Approves comment.
   */
  adminApprove(id: number | string) {
    return this.customPost(`/admin/comments/${id}/approve`, {});
  }

  /**
   * adminReject
   * pt-BR: Rejeita comentário.
   * en-US: Rejects comment.
   */
  adminReject(id: number | string) {
    return this.customPost(`/admin/comments/${id}/reject`, {});
  }

  /**
   * adminDelete
   * pt-BR: Exclui comentário.
   * en-US: Deletes comment.
   */
  adminDelete(id: number | string) {
    return this.customDelete(`/admin/comments/${id}`);
  }
}

// pt-BR: Instancia com endpoint base vazio para evitar duplicar prefixos.
// en-US: Instantiate with empty base endpoint to avoid duplicating prefixes.
const commentsService = new CommentsService('');
export default commentsService;