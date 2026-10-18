// ==============================================================================
// Altrivelle Linker — Subscription Plans & Entitlements Specification
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

export const SUBSCRIPTION_PLANS = {
  community: {
    id: 'community',
    name: 'Community',
    badge: 'Open Core',
    price: '$0',
    interval: 'forever',
    description: 'Essential file sharing and peer-to-peer transfers for individuals and students.',
    limits: {
      maxUploadBytes: 25 * 1024 * 1024, // 25 MB
      maxUploadMB: 25,
      storageQuotaBytes: 100 * 1024 * 1024, // 100 MB
      storageQuotaMB: 100,
      maxActiveShares: 10,
      customAliasesAllowed: false,
      apiAccessAllowed: false,
      webhooksAllowed: false,
      teamMembersLimit: 1,
      p2pTransferAllowed: true,
      fileRequestsAllowed: true,
      maxFileRequestSubmissions: 5,
    },
    features: [
      'Adaptive Transfers (Cloud, Ephemeral, P2P WebRTC)',
      'Trust Passport security breakdown',
      'Password protection & custom expiration',
      'Image, PDF, and media previews',
      'Basic File Requests (up to 5 submissions)',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Creator & Dev',
    price: '$9',
    interval: '/month',
    description: 'High-bandwidth sharing, developer automation, and custom short links for creators.',
    limits: {
      maxUploadBytes: 500 * 1024 * 1024, // 500 MB
      maxUploadMB: 500,
      storageQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      storageQuotaMB: 10240,
      maxActiveShares: 100,
      customAliasesAllowed: true,
      apiAccessAllowed: true,
      webhooksAllowed: true,
      teamMembersLimit: 1,
      p2pTransferAllowed: true,
      fileRequestsAllowed: true,
      maxFileRequestSubmissions: 50,
    },
    features: [
      'Everything in Community',
      '500 MB per file upload limit',
      '10 GB encrypted cloud storage',
      'Custom short-link aliases',
      'Full REST API & CLI automation',
      'Signed Webhooks for upload & download events',
      'Priority transfer bandwidth',
    ],
  },

  team: {
    id: 'team',
    name: 'Team Workspace',
    badge: 'Enterprise Ready',
    price: '$29',
    interval: '/month',
    description: 'Collaborative workspaces, shared quotas, team permissions, and audit logs.',
    limits: {
      maxUploadBytes: 2 * 1024 * 1024 * 1024, // 2 GB
      maxUploadMB: 2048,
      storageQuotaBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      storageQuotaMB: 102400,
      maxActiveShares: 1000,
      customAliasesAllowed: true,
      apiAccessAllowed: true,
      webhooksAllowed: true,
      teamMembersLimit: 15,
      p2pTransferAllowed: true,
      fileRequestsAllowed: true,
      maxFileRequestSubmissions: 500,
    },
    features: [
      'Everything in Pro',
      '2 GB per file upload limit',
      '100 GB pooled storage quota',
      'Team workspaces & role-based access',
      'Detailed security & audit logs',
      'Admin controls & team quotas',
    ],
  },

  self_hosted: {
    id: 'self_hosted',
    name: 'Self-Hosted',
    badge: 'Open Source',
    price: 'Free',
    interval: 'self-managed',
    description: 'Full autonomy on your private VPS, Docker, or Kubernetes infrastructure.',
    limits: {
      maxUploadBytes: 5 * 1024 * 1024 * 1024, // Configurable (default 5GB)
      maxUploadMB: 5120,
      storageQuotaBytes: 1024 * 1024 * 1024 * 1024, // Configurable (default 1TB)
      storageQuotaMB: 1048576,
      maxActiveShares: 999999,
      customAliasesAllowed: true,
      apiAccessAllowed: true,
      webhooksAllowed: true,
      teamMembersLimit: 999,
      p2pTransferAllowed: true,
      fileRequestsAllowed: true,
      maxFileRequestSubmissions: 9999,
    },
    features: [
      'Complete open-source codebase (AGPL/MIT)',
      'Bring Your Own Storage (S3, MinIO, R2, Supabase)',
      'Unrestricted quotas and user capacity',
      'Full control over data sovereignty & encryption keys',
    ],
  },
};
