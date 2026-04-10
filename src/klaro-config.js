/*
 * Klaro! consent manager configuration for christos.logotechnologia.com
 *
 * Cookie domain set to .logotechnologia.com so consent is shared
 * across all subdomains (www, christos, etc.).
 *
 * Mirrors the service declarations and translations of
 * www.logotechnologia.com for consistency.
 */
(function () {
  window.klaroConfig = {
    version: 1,
    elementID: "klaro",
    storageMethod: "cookie",
    cookieName: "klaro",
    cookieDomain: ".logotechnologia.com",
    cookieExpiresAfterDays: 365,

    // UI behaviour
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

    privacyPolicy: "https://www.logotechnologia.com/privacy",

    // ── Translations ────────────────────────────────────────────────
    translations: {
      zz: {
        privacyPolicyUrl: "https://www.logotechnologia.com/privacy",
      },

      en: {
        consentModal: {
          title: "Privacy Settings",
          description:
            "Here you can review and adjust which services are allowed to load on this site. You stay in control — your preferences are stored locally and can be changed at any time.",
        },
        consentNotice: {
          title: "Cookies & Data Protection",
          changeDescription:
            "There have been changes since your last visit — please renew your preferences.",
          description:
            'Hi! This website uses strictly-necessary technical cookies (Cloudflare) for secure operation and offers anonymous traffic measurement (Cloudflare Web Analytics) with your consent. No advertising services are used. You can always manage your preferences by clicking "{learnMoreLink}".',
          learnMore: "Settings",
        },
        privacyPolicy: {
          name: "privacy policy",
          text: "To learn more, please read our {privacyPolicy}.",
        },
        purposes: {
          functional: {
            title: "Functional",
            description:
              "Services required for the technical operation and security of the website.",
          },
          analytics: {
            title: "Traffic analytics",
            description:
              "Services that measure traffic anonymously, without personally identifying visitors.",
          },
        },
        purposeItem: {
          service: "service",
          services: "services",
        },
        ok: "OK",
        save: "Save",
        decline: "Decline",
        close: "Close",
        acceptAll: "Accept all",
        acceptSelected: "Save selection",
        poweredBy: "",
        service: {
          disableAll: {
            title: "Enable / disable all",
            description: "Toggle all optional services at once.",
          },
          optOut: {
            title: "(opt-out)",
            description: "Enabled by default; you may disable it.",
          },
          required: {
            title: "(always required)",
            description:
              "This service is strictly necessary for the operation and security of the website and cannot be disabled.",
          },
          purposes: "Purposes",
          purpose: "Purpose",
        },
        cloudflare: {
          description:
            "Technical infrastructure (CDN, DNS, DDoS protection, bot management). Strictly necessary for the secure and reliable operation of the website.",
        },
        "cloudflare-analytics": {
          description:
            "Cloudflare Web Analytics — anonymous, cookieless traffic measurement. Uses the same Cloudflare infrastructure that already serves the website.",
        },
        "google-analytics": {
          description:
            "Google Analytics — traffic measurement and user-behaviour analysis. Uses third-party cookies. Only activated with your consent.",
        },
      },
    },

    // ── Services ───────────────────────────────────────────────────
    services: [
      {
        name: "cloudflare",
        title: "Cloudflare",
        purposes: ["functional"],
        required: true,
        cookies: [
          [/^__cf_bm$/, "/", ".logotechnologia.com"],
          [/^_cfuvid$/, "/", ".logotechnologia.com"],
          [/^cf_clearance$/, "/", ".logotechnologia.com"],
        ],
      },
      {
        name: "cloudflare-analytics",
        title: "Cloudflare Web Analytics",
        purposes: ["functional"],
        required: true,
        cookies: [],
      },
      {
        name: "google-analytics",
        title: "Google Analytics",
        purposes: ["analytics"],
        required: false,
        default: false,
        cookies: [
          [/^_ga/, "/", ".logotechnologia.com"],
          [/^_gid$/, "/", ".logotechnologia.com"],
          [/^_gat/, "/", ".logotechnologia.com"],
        ],
      },
    ],
  };
})();
