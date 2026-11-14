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

  // The GitHub repository and branch Amplify deploys from. The dashboard at /admin
  // reads and commits content.json files here.
  repo: { owner: 'quinnhopkinsart', name: 'XR', branch: 'main' },

  mainSite: 'https://www.noodinstudio.com',
  instagram: 'https://www.instagram.com/noodinstudio',
  // The address people write to. The footer link and the "For events" block open an email.
  email: 'quinn@noodinstudio.com',
  contact: 'mailto:quinn@noodinstudio.com',
};

// An email about bringing one work to an event, with the work named in the subject line.
export const inquiryUrl = (title) =>
  `mailto:${site.email}?subject=${encodeURIComponent(`Event inquiry: ${title}`)}`;

// A work's page on the portfolio (the Wix headless site). `slug` is the Work item's slug in
// the portfolio's CMS, which is not always the slug used here.
export const portfolioUrl = (slug) => `${site.mainSite}/project.html?slug=${encodeURIComponent(slug)}`;

export const workUrl = (slug) => `${site.url}${site.workPath}/${slug}`;
