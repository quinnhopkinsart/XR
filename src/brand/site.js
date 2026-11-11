// Site-wide settings. Edit here, not in components.

export const site = {
  name: 'Noodin Studio',
  artist: 'Quinn Hopkins',
  title: 'Noodin Studio XR',

  // Canonical address the QR codes and work links use. Set VITE_SITE_URL in Amplify
  // (App settings > Environment variables) to change it without touching code.
  // The site is served from xr.noodin.studio. The bare noodin.studio does not serve it.
  url: (import.meta.env.VITE_SITE_URL || 'https://xr.noodin.studio').replace(/\/$/, ''),

  // Route prefix for every work. /ar/<slug> also redirects here so codes
  // printed with the catalogue's noodin.studio/ar/<slug> pattern keep working.
  workPath: '/xr',

  mainSite: 'https://www.noodinstudio.com',
  instagram: 'https://www.instagram.com/noodinstudio',
  contact: 'https://www.noodinstudio.com/contact',
};

export const workUrl = (slug) => `${site.url}${site.workPath}/${slug}`;
