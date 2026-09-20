export interface MediaFile {
  id: number;
  user_id?: string;
  original_name?: string;
  storage_path?: string;
  hls_path?: string;
  public_url?: string;
  hls_url?: string;
  thumbnail_url?: string;
  effective_stream_url?: string;
  mime_type?: string;
  size_bytes?: number;
  formatted_size?: string;
  duration_seconds?: number;
  formatted_duration?: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  is_ready?: boolean;
  is_orphan?: boolean;
  linked_activity_id?: number | null;
  allow_download?: boolean;
  download_count?: number;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MediaStats {
  total: number;
  orphans: number;
  linked: number;
  ready: number;
  processing: number;
  failed: number;
  total_bytes: number;
  orphan_bytes: number;
  total_size: string;
  orphan_size: string;
}

export interface MediaScanResult {
  success: boolean;
  imported: number;
  skipped: number;
  discovered: MediaFile[];
  message: string;
}

export interface ShareTokenResult {
  success: boolean;
  token: string;
  watch_url: string;
  expires_at: string;
  expires_hours: number;
}

export interface DownloadResult {
  success: boolean;
  download_url: string;
  filename: string;
  expires_in: number;
}
