// Klaro consent manager configuration
// Cookie is shared across *.logotechnologia.com via cookieDomain

window.klaroConfig = {
  version: 1,
  elementID: "klaro",
  storageMethod: "cookie",
  cookieName: "klaro",
  cookieDomain: ".logotechnologia.com",
  cookieExpiresAfterDays: 365,

  // UI behavior
  htmlTexts: true,
  embedded: false,
  noticeAsModal: false,
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  disablePoweredBy: true,
  groupByPurpose: true,
  default: false,

  translations: {
    en: {
      consentModal: {
        title: "Privacy settings",
        description:
          "We use cookies and similar technologies. You can choose which services to allow below.",
      },
      consentNotice: {
        description:
          "We use cookies for analytics. You can accept or manage your preferences.",
        learnMore: "Manage preferences",
      },
      purposes: {
        analytics: {
          title: "Analytics",
          description: "Services that help us understand how the site is used.",
        },
      },
      ok: "Accept all",
      decline: "Decline",
      save: "Save",
      acceptAll: "Accept all",
      acceptSelected: "Save selection",
    },
  },

  services: [
    {
      name: "google-analytics",
      title: "Google Analytics",
      purposes: ["analytics"],
      cookies: [/^_ga/, /^_gid/, /^_gat/],
      default: false,
      required: false,
      optOut: false,
      onlyOnce: false,
    },
  ],
};
