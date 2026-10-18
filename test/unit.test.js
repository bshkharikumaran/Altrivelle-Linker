import { describe, it, expect } from 'vitest';
import { generateSecureToken, shareService } from '../src/services/share.service.js';
import { riskAdvisor } from '../src/services/riskAdvisor.service.js';
import { adaptiveTransferService, TRANSFER_MODES } from '../src/services/transfer.service.js';
import { SUBSCRIPTION_PLANS } from '../src/config/plans.js';
import { ADMIN_EMAIL, adminService } from '../src/services/admin.service.js';

describe('Altrivelle Linker — Automated Unit Test Suite', () => {
  it('generates cryptographically unguessable random tokens of desired length', () => {
    const token1 = generateSecureToken(16);
    const token2 = generateSecureToken(16);

    expect(token1).toHaveLength(16);
    expect(token2).toHaveLength(16);
    expect(token1).not.toBe(token2);
    expect(typeof token1).toBe('string');
  });

  it('evaluates share security with deterministic Share Risk Advisor', () => {
    // 1. High risk test (sensitive file + executable + no expiration)
    const highRisk = riskAdvisor.analyze({
      fileName: 'company_payroll_secrets.exe',
      duration: 'never',
      password: '',
      maxDownloads: null,
    });

    expect(highRisk.level).toBe('HIGH');
    expect(highRisk.riskPoints).toBeGreaterThanOrEqual(50);
    expect(highRisk.riskFactors.some((f) => f.title.includes('Sensitive Filename'))).toBe(true);
    expect(highRisk.riskFactors.some((f) => f.title.includes('Executable'))).toBe(true);

    // 2. Low risk test (normal document + 1 day expiration + password + download limit)
    const lowRisk = riskAdvisor.analyze({
      fileName: 'presentation_deck.pdf',
      duration: '1d',
      password: 'StrongPassword123!',
      maxDownloads: 3,
    });

    expect(lowRisk.level).toBe('LOW');
    expect(lowRisk.riskPoints).toBeLessThan(25);
  });

  it('correctly recommends transfer modes in Adaptive Transfer Engine', () => {
    // Huge file with recipient online -> Mode C (P2P WebRTC)
    const p2pRec = adaptiveTransferService.recommendMode({
      fileSize: 200 * 1024 * 1024,
      isRecipientOnline: true,
      requiresLongTerm: false,
    });
    expect(p2pRec.mode).toBe(TRANSFER_MODES.P2P);

    // Short-term deliverable -> Mode B (Ephemeral)
    const ephemRec = adaptiveTransferService.recommendMode({
      fileSize: 10 * 1024 * 1024,
      isRecipientOnline: false,
      requiresLongTerm: false,
      highPrivacy: true,
    });
    expect(ephemRec.mode).toBe(TRANSFER_MODES.EPHEMERAL);

    // Long-term asset -> Mode A (Persistent Cloud)
    const cloudRec = adaptiveTransferService.recommendMode({
      fileSize: 10 * 1024 * 1024,
      isRecipientOnline: false,
      requiresLongTerm: true,
      highPrivacy: false,
    });
    expect(cloudRec.mode).toBe(TRANSFER_MODES.PERSISTENT);
  });

  it('defines valid subscription plans with server-side limit thresholds', () => {
    expect(SUBSCRIPTION_PLANS.community).toBeDefined();
    expect(SUBSCRIPTION_PLANS.community.limits.maxUploadMB).toBe(25);
    expect(SUBSCRIPTION_PLANS.community.limits.storageQuotaMB).toBe(100);

    expect(SUBSCRIPTION_PLANS.pro).toBeDefined();
    expect(SUBSCRIPTION_PLANS.pro.limits.maxUploadMB).toBe(500);
    expect(SUBSCRIPTION_PLANS.pro.limits.customAliasesAllowed).toBe(true);

    expect(SUBSCRIPTION_PLANS.self_hosted).toBeDefined();
    expect(SUBSCRIPTION_PLANS.self_hosted.badge).toBe('Open Source');
  });

  it('validates designated platform administrator identity', () => {
    expect(ADMIN_EMAIL).toBe('sriharibshk@gmail.com');
  });

  it('calculates link expiration presets correctly', () => {
    const never = shareService.calculateExpiration('never');
    expect(never).toBeNull();

    const oneHour = shareService.calculateExpiration('1h');
    expect(new Date(oneHour).getTime()).toBeGreaterThan(Date.now());

    const sevenDays = shareService.calculateExpiration('7d');
    expect(new Date(sevenDays).getTime()).toBeGreaterThan(new Date(oneHour).getTime());
  });

  it('safely handles invalid or missing share tokens without throwing uncaught errors', async () => {
    const res = await shareService.resolveShareToken('');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.developer).toBe('ALTRIVELLE TECHNOLOGIES');
  });

  it('generates direct file links and responsive HTML embed snippets', () => {
    const token = 'test-token-xyz';
    const directUrl = shareService.buildDirectFileUrl(token);
    expect(directUrl).toContain(`/api/share/${token}?raw=1`);

    // Image snippet
    const imgSnippet = shareService.buildHtmlSnippet({ name: 'banner.png', mime_type: 'image/png' }, token);
    expect(imgSnippet).toBe(`<img src="${directUrl}" alt="banner.png" />`);

    // Video snippet
    const videoSnippet = shareService.buildHtmlSnippet({ name: 'promo.mp4', mime_type: 'video/mp4' }, token);
    expect(videoSnippet).toBe(`<video controls src="${directUrl}"></video>`);

    // Audio snippet
    const audioSnippet = shareService.buildHtmlSnippet({ name: 'track.mp3', mime_type: 'audio/mpeg' }, token);
    expect(audioSnippet).toBe(`<audio controls src="${directUrl}"></audio>`);

    // Generic document snippet
    const docSnippet = shareService.buildHtmlSnippet({ name: 'report.zip', mime_type: 'application/zip' }, token);
    expect(docSnippet).toBe(`<a href="${directUrl}" download="report.zip">report.zip</a>`);
  });

  it('formats subscription plan pricing in Indian Rupee (₹ INR)', () => {
    expect(SUBSCRIPTION_PLANS.community.price).toBe('₹0');
    expect(SUBSCRIPTION_PLANS.pro.price).toBe('₹499');
    expect(SUBSCRIPTION_PLANS.team.price).toBe('₹1,999');
    expect(SUBSCRIPTION_PLANS.self_hosted.price).toBe('Free');
  });

  it('generates compliant 6-character room codes for Direct Device-to-Device P2P transfers', async () => {
    const { p2pTransferService } = await import('../src/services/transfer.service.js');
    const roomCode = p2pTransferService.generateRoomCode();
    expect(roomCode).toMatch(/^ALT-[0-9A-Z]{4}$/);
    expect(roomCode).toHaveLength(8);
  });

  it('safely evaluates share link passcodes without revealing secret tokens', async () => {
    const res = await shareService.verifyPassword('invalid-token', 'wrong-pass');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  }, 15000);

  it('manages text annotations and exports formatted markdown reviews', async () => {
    const { annotationsService } = await import('../src/services/annotations.service.js');
    const testFileId = 'test-file-abc-123';

    // Add note
    const note = annotationsService.addAnnotation(testFileId, {
      text: 'Please verify the header alignment and typography.',
      tag: 'review',
      author: 'QA Lead',
      type: 'note',
    });

    expect(note.id).toBeDefined();
    expect(note.tag).toBe('review');
    expect(note.text).toContain('header alignment');

    // Add visual pin
    const pin = annotationsService.addAnnotation(testFileId, {
      text: 'Logo position check',
      tag: 'urgent',
      author: 'Designer',
      type: 'pin',
      xPercent: 45.5,
      yPercent: 20.2,
    });

    expect(pin.type).toBe('pin');
    expect(pin.xPercent).toBe(45.5);

    // List notes
    const list = annotationsService.getAnnotations(testFileId);
    expect(list.length).toBeGreaterThanOrEqual(2);

    // Export markdown
    const md = annotationsService.exportToMarkdown(testFileId, 'Logo.png');
    expect(md).toContain('Annotations & Review Notes');
    expect(md).toContain('Logo position check');
    expect(md).toContain('ALTRIVELLE TECHNOLOGIES');

    // Clean up
    annotationsService.deleteAnnotation(testFileId, note.id);
    annotationsService.deleteAnnotation(testFileId, pin.id);
  });

  it('correctly detects compressible files and minifies structured text in Smart Compression Engine', async () => {
    const { compressionService, COMPRESSION_MODES } = await import('../src/services/compression.service.js');

    expect(compressionService.isCompressibleImage('image/png', 'photo.png')).toBe(true);
    expect(compressionService.isCompressibleImage('image/jpeg', 'banner.jpg')).toBe(true);
    expect(compressionService.isCompressibleImage('image/svg+xml', 'vector.svg')).toBe(false);
    expect(compressionService.isCompressibleText('application/json', 'data.json')).toBe(true);
    expect(compressionService.isCompressibleText('text/plain', 'notes.txt')).toBe(true);

    // Mode management
    compressionService.setMode(COMPRESSION_MODES.SMART);
    expect(compressionService.getMode()).toBe(COMPRESSION_MODES.SMART);
    compressionService.setMode(COMPRESSION_MODES.ORIGINAL);
    expect(compressionService.getMode()).toBe(COMPRESSION_MODES.ORIGINAL);

    // Minify text/json
    const rawJson = '{\n  "company": "ALTRIVELLE TECHNOLOGIES",\n  "status": "active"\n}';
    const minified = compressionService.compressText(rawJson, 'config.json');
    expect(minified.compressedBytes).toBeLessThan(minified.originalBytes);
    expect(minified.content).toBe('{"company":"ALTRIVELLE TECHNOLOGIES","status":"active"}');
  });
});
