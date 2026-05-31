/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string;
  // Nubefact (facturación electrónica SUNAT)
  readonly VITE_NUBEFACT_RUC: string;
  readonly VITE_NUBEFACT_TOKEN: string;
  readonly VITE_NUBEFACT_RAZON_SOCIAL: string;
  readonly VITE_NUBEFACT_DIRECCION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
