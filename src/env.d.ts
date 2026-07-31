/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_BUSINESS_PHONE?: string;
  readonly PUBLIC_BUSINESS_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
