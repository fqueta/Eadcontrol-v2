import { BaseApiService } from './BaseApiService';

/**
 * VideoTipConfig
 * pt-BR: Dados de configuração de um vídeo/dica armazenados no campo config do Post.
 * en-US: Configuration data for a video tip stored in the Post's config field.
 */
export interface VideoTipConfig {
  video_url: string;
  provider: 'youtube' | 'vimeo' | 'other';
  video_id: string;
  thumbnail: string | null;
  embed_url: string;
  duration_seconds?: number;
  category?: string;
}

/**
 * VideoTip
 * pt-BR: Representa um vídeo/dica postado pelo dono da escola para os alunos.
 * en-US: Represents a video tip posted by the school owner for students.
 */
export interface VideoTip {
  id: number;
  title: string;
  description: string | null;
  excerpt: string | null;
  menu_order: number;
  created_at: string;
  config: VideoTipConfig;
  video_url: string | null;
  provider: 'youtube' | 'vimeo' | 'other' | null;
  video_id: string | null;
  thumbnail: string | null;
  embed_url: string | null;
  // Campos extras presentes na listagem admin
  post_title?: string;
  post_content?: string;
  post_excerpt?: string;
  post_status?: 'publish' | 'draft' | 'private' | 'pending';
  post_type?: string;
  ID?: number;
}

/**
 * VideoTipCreateInput
 * pt-BR: Payload para criação de um vídeo/dica.
 * en-US: Payload for creating a video tip.
 */
export interface VideoTipCreateInput {
  post_title: string;
  post_content?: string;
  post_excerpt?: string;
  post_status: 'publish' | 'draft';
  menu_order?: number;
  post_type: 'video_tip';
  config: VideoTipConfig;
}

/**
 * VideoTipUpdateInput
 * pt-BR: Payload para atualização de um vídeo/dica.
 * en-US: Payload for updating a video tip.
 */
export type VideoTipUpdateInput = Partial<VideoTipCreateInput>;

/**
 * extractVideoMeta
 * pt-BR: Extrai metadados do vídeo (provider, id, thumbnail, embed_url) a partir da URL.
 * en-US: Extracts video metadata (provider, id, thumbnail, embed_url) from the URL.
 */
export function extractVideoMeta(url: string): Omit<VideoTipConfig, 'duration_seconds'> {
  const trimmed = url.trim();

  // YouTube — formatos: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytShort = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  const ytWatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  const ytEmbed = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  const ytShorts = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  const ytId = (ytShort?.[1] ?? ytWatch?.[1] ?? ytEmbed?.[1] ?? ytShorts?.[1]) ?? null;

  if (ytId) {
    return {
      video_url: trimmed,
      provider: 'youtube',
      video_id: ytId,
      thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      embed_url: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`,
    };
  }

  // Vimeo — formatos: vimeo.com/ID, player.vimeo.com/video/ID
  const vmMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vmMatch) {
    const vmId = vmMatch[1];
    return {
      video_url: trimmed,
      provider: 'vimeo',
      video_id: vmId,
      // Vimeo não expõe thumbnail via URL estática; usamos placeholder
      thumbnail: `https://vumbnail.com/${vmId}.jpg`,
      embed_url: `https://player.vimeo.com/video/${vmId}?badge=0&autopause=0`,
    };
  }

  // Outro formato
  return {
    video_url: trimmed,
    provider: 'other',
    video_id: '',
    thumbnail: null,
    embed_url: trimmed,
  };
}

/**
 * VideoTipsService
 * pt-BR: Serviço para gerenciamento de vídeos/dicas (admin) e listagem para alunos.
 * en-US: Service for video tips management (admin) and student listing.
 */
class VideoTipsService extends BaseApiService {
  private readonly endpoint = '/posts';
  private readonly studentEndpoint = '/video-tips';

  // ──────────────────────────────────────────
  // Admin — CRUD completo
  // ──────────────────────────────────────────

  /**
   * adminList
   * pt-BR: Lista vídeos/dicas para o painel do admin com paginação.
   * en-US: Lists video tips for the admin panel with pagination.
   */
  async adminList(params: {
    page?: number;
    per_page?: number;
    post_status?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<any> {
    return this.get(this.endpoint, {
      post_type: 'video_tip',
      per_page: params.per_page ?? 20,
      page: params.page ?? 1,
      order_by: 'menu_order',
      order: params.order ?? 'asc',
      ...(params.post_status ? { post_status: params.post_status } : {}),
    });
  }

  /**
   * adminCreate
   * pt-BR: Cria um novo vídeo/dica.
   * en-US: Creates a new video tip.
   */
  async adminCreate(data: VideoTipCreateInput): Promise<VideoTip> {
    const response = await this.post<any>(this.endpoint, data);
    return response.data ?? response;
  }

  /**
   * adminUpdate
   * pt-BR: Atualiza um vídeo/dica existente.
   * en-US: Updates an existing video tip.
   */
  async adminUpdate(id: number, data: VideoTipUpdateInput): Promise<VideoTip> {
    const response = await this.put<any>(`${this.endpoint}/${id}`, data);
    return response.data ?? response;
  }

  /**
   * adminDelete
   * pt-BR: Move um vídeo/dica para a lixeira (soft delete).
   * en-US: Moves a video tip to trash (soft delete).
   */
  async adminDelete(id: number): Promise<void> {
    await this.delete<void>(`${this.endpoint}/${id}`);
  }

  /**
   * adminToggleStatus
   * pt-BR: Alterna o status entre publish e draft.
   * en-US: Toggles status between publish and draft.
   */
  async adminToggleStatus(id: number, currentStatus: 'publish' | 'draft'): Promise<VideoTip> {
    const newStatus = currentStatus === 'publish' ? 'draft' : 'publish';
    return this.adminUpdate(id, { post_status: newStatus });
  }

  // ──────────────────────────────────────────
  // Aluno — Leitura pública autenticada
  // ──────────────────────────────────────────

  /**
   * getStudentTips
   * pt-BR: Retorna vídeos/dicas publicados para o aluno autenticado.
   * en-US: Returns published video tips for the authenticated student.
   */
  async getStudentTips(params: { per_page?: number; page?: number } = {}): Promise<any> {
    return this.get(this.studentEndpoint, {
      per_page: params.per_page ?? 20,
      page: params.page ?? 1,
    });
  }
}

export const videoTipsService = new VideoTipsService();
