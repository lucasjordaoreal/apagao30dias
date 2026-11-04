const configuredUrl = '__APAGAO_PUBLIC_URL__';

export const SITE_URL = configuredUrl.startsWith('__')
  ? new URL('../', import.meta.url).href
  : configuredUrl;
export const SOCIAL_IMAGE_URL = new URL('public/social-preview.png', SITE_URL).href;
