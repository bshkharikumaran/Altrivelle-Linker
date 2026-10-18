// ==============================================================================
// Altrivelle Linker — Public Landing & Showcase View
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// "Send files. Receive files. Control access. Automate everything."
// ==============================================================================

import { icons } from '../ui/icons.js';
import { APP_CONFIG } from '../config.js';

export const landingView = {
  render(container) {
    container.innerHTML = `
      <div class="landing-page-wrapper animate-fade-in">
        <!-- Hero Section -->
        <section class="landing-hero">
          <div class="landing-glow glow-hero-1"></div>
          <div class="landing-glow glow-hero-2"></div>

          <div class="hero-content-box">
            <div class="hero-badge animate-scale-up">
              <span class="badge-icon">${icons.sparkles(16)}</span>
              <span>Developed by ALTRIVELLE TECHNOLOGIES</span>
            </div>

            <h1 class="hero-headline">
              One Link. <span class="gradient-text">Smarter Sharing.</span>
            </h1>

            <p class="hero-subtext">
              Send files. Receive files. Control access. Automate everything. An innovative, production-oriented file sharing platform built on zero-trust storage and open architecture.
            </p>

            <div class="hero-cta-group">
              <a href="#dashboard" class="btn btn-primary btn-lg">
                ${icons.uploadCloud(20)} Launch App Dashboard
              </a>
              <a href="#transfers" class="btn btn-outline btn-lg">
                Explore Adaptive Transfers
              </a>
            </div>

            <!-- Hero Feature Pills -->
            <div class="hero-feature-pills mt-4">
              <span class="pill-item">${icons.shield(14)} Trust Passport &trade;</span>
              <span class="pill-item">${icons.sparkles(14)} Direct WebRTC P2P</span>
              <span class="pill-item">${icons.uploadCloud(14)} DropBox File Requests</span>
              <span class="pill-item">${icons.hardDrive(14)} BYOS Storage Abstraction</span>
            </div>
          </div>
        </section>

        <!-- Pillars Section -->
        <section class="landing-pillars-section mt-5">
          <div class="section-card-header text-center mx-auto" style="max-width: 650px;">
            <h2 class="section-title text-2xl">The Four Flagship Innovations</h2>
            <p class="section-subtitle">Engineered to transcend generic cloud storage with intelligent routing and provenance</p>
          </div>

          <div class="pillars-grid mt-4">
            <div class="pillar-card glass-panel">
              <div class="pillar-icon text-primary">${icons.sparkles(28)}</div>
              <h3>Adaptive Transfer</h3>
              <p>Dynamically chooses between Persistent Cloud storage, Ephemeral self-destructing links, and Direct Browser-to-Browser WebRTC tunnels.</p>
            </div>

            <div class="pillar-card glass-panel">
              <div class="pillar-icon text-indigo">${icons.shield(28)}</div>
              <h3>Trust Passport &trade;</h3>
              <p>Transparent security panel displaying cryptographic SHA-256 integrity checksums, expiration countdowns, and quota limits for every shared asset.</p>
            </div>

            <div class="pillar-card glass-panel">
              <div class="pillar-icon text-emerald">${icons.uploadCloud(28)}</div>
              <h3>DropBox File Requests</h3>
              <p>Generate secure, isolated upload links to receive assignments or client deliverables without forcing contributors to create accounts.</p>
            </div>

            <div class="pillar-card glass-panel">
              <div class="pillar-icon text-purple">${icons.hardDrive(28)}</div>
              <h3>Developer Flow</h3>
              <p>Full REST API, official CLI binary tool, and HMAC-SHA256 signed webhooks to automate your release workflows and CI/CD pipelines.</p>
            </div>
          </div>
        </section>

        <!-- Company Showcase Banner -->
        <section class="company-showcase-section mt-5">
          <div class="company-banner-card glass-panel text-center">
            <img src="/assets/altrivelle-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="company-banner-logo" onerror="this.style.display='none'" />
            <h2 class="company-banner-name">ALTRIVELLE TECHNOLOGIES</h2>
            <p class="company-banner-tagline">Think Beyond. Build Forward.</p>
            <p class="company-banner-manifesto mt-3">
              We design software platforms that prioritize data sovereignty, user autonomy, high security, and developer elegance. Altrivelle Linker is available as an enterprise cloud service and a self-hostable open-source engine.
            </p>
            <div class="mt-4">
              <a href="#plans" class="btn btn-outline">Explore Plans & Entitlements</a>
            </div>
          </div>
        </section>
      </div>
    `;
  },
};
