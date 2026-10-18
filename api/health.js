// ==============================================================================
// Altrivelle Linker — Health & System Information API
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({
    status: 'healthy',
    platform: 'Altrivelle Linker',
    developer: 'ALTRIVELLE TECHNOLOGIES',
    tagline: 'One Link. Smarter Sharing.',
    coreMessage: 'Send files. Receive files. Control access. Automate everything.',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      adaptiveTransfer: ['persistent', 'ephemeral', 'p2p-webrtc'],
      trustPassport: true,
      fileRequests: true,
      shareRiskAdvisor: true,
      byosAbstraction: true,
      webhooks: true,
      restApi: true,
      cli: true,
    },
    services: {
      auth: 'Supabase Auth',
      database: 'PostgreSQL with Row Level Security',
      storage: 'Supabase Storage (filelink-files private bucket)',
      serverless: 'Vercel Edge Functions',
    },
  });
}
