// ==============================================================================
// Altrivelle Linker — Share Risk Advisor
// Developed by ALTRIVELLE TECHNOLOGIES
// Deterministic, Privacy-Preserving Security & Risk Analysis
// ==============================================================================

const SENSITIVE_KEYWORDS = [
  'password', 'passwd', 'secret', 'key', 'private', 'id_rsa', 'credential',
  'token', 'apikey', 'auth', 'tax', 'w2', 'salary', 'payroll', 'bank',
  'statement', 'ssn', 'passport', 'financial', 'confidential', 'internal'
];

const RISKY_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'vbs', 'ps1', 'scr', 'msi', 'apk', 'jar', 'app'
];

export const riskAdvisor = {
  analyze({ fileName = '', duration = '7d', password = '', maxDownloads = null, isPublic = true }) {
    const riskFactors = [];
    const recommendations = [];
    let riskPoints = 0;

    const lowerName = fileName.toLowerCase();
    const ext = lowerName.split('.').pop() || '';

    // 1. Sensitive Keyword Check in Filename
    const matchedKeywords = SENSITIVE_KEYWORDS.filter((kw) => lowerName.includes(kw));
    if (matchedKeywords.length > 0) {
      riskPoints += 35;
      riskFactors.push({
        severity: 'HIGH',
        title: 'Sensitive Filename Detected',
        description: `Filename contains sensitive indicators: "${matchedKeywords.join(', ')}". Ensure this asset does not expose proprietary or personal data.`,
      });
      recommendations.push('Protect this link with a strong password.');
      recommendations.push('Set an aggressive expiration (e.g., 1 hour or 24 hours).');
    }

    // 2. Executable / Active Code Extension Check
    if (RISKY_EXTENSIONS.includes(ext)) {
      riskPoints += 40;
      riskFactors.push({
        severity: 'HIGH',
        title: 'Executable / Script File Type',
        description: `File extension ".${ext}" can execute code on recipient machines and is subject to security filter scrutiny.`,
      });
      recommendations.push('Verify recipient identity before sending executable binaries.');
    }

    // 3. Expiration Analysis
    if (!duration || duration === 'never') {
      riskPoints += 25;
      riskFactors.push({
        severity: 'MEDIUM',
        title: 'No Expiration Configured',
        description: 'Links without expiration remain accessible indefinitely until manually revoked.',
      });
      recommendations.push('Set an expiration timeframe (e.g. 7 days or 24 hours).');
    } else if (duration === '30d') {
      riskPoints += 10;
      riskFactors.push({
        severity: 'LOW',
        title: 'Extended Expiration Window (30 Days)',
        description: 'Long validity periods increase the window of exposure if the URL is leaked.',
      });
    }

    // 4. Download Limits
    if (!maxDownloads || Number(maxDownloads) > 50) {
      riskPoints += 15;
      riskFactors.push({
        severity: 'LOW',
        title: 'Uncapped or High Download Allowance',
        description: 'Unlimited downloads allow anyone with the link to retrieve the file repeatedly.',
      });
      recommendations.push('Limit downloads to the intended number of recipients (e.g., 3-5 downloads).');
    }

    // 5. Password Protection
    if (!password || password.trim() === '') {
      riskPoints += 15;
      riskFactors.push({
        severity: 'LOW',
        title: 'No Password Protection',
        description: 'Anyone with possession of the URL token can immediately download the content.',
      });
      recommendations.push('Add an access password to prevent unauthorized link sharing.');
    }

    // Determine final score & level
    let level = 'LOW';
    let badgeClass = 'text-success';
    let summary = 'Safe share profile. Standard security best practices satisfied.';

    if (riskPoints >= 50) {
      level = 'HIGH';
      badgeClass = 'text-danger';
      summary = 'High sensitivity detected. We strongly suggest enabling password protection and link expiration.';
    } else if (riskPoints >= 25) {
      level = 'MEDIUM';
      badgeClass = 'text-warning';
      summary = 'Moderate risk profile. Review recommended mitigations below.';
    }

    return {
      riskPoints,
      level,
      badgeClass,
      summary,
      riskFactors,
      recommendations: Array.from(new Set(recommendations)),
    };
  },
};
