/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_API_DOMAIN?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_DEBUG?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_USE_MOCK_CLIENTS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}