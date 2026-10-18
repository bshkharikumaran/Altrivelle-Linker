// ==============================================================================
// Altrivelle Linker — Public Landing & Showcase View
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// "Send files. Receive files. Control access. Automate everything."
// ==============================================================================

import { icons } from '../ui/icons.js';
import { APP_CONFIG } from '../config.js';
import { SUBSCRIPTION_PLANS } from '../config/plans.js';

export const landingView = {
  render(container) {
    container.innerHTML = `
      <div class="landing-page-wrapper animate-fade-in">
        <!-- Hero Section -->
        <section class="landing-hero">
          <div class="landing-glow glow-hero-1"></div>
          <div class="landing-glow glow-hero-2"></div>

          <div class="hero-content-box">
            <div class="hero-badge animate-float">
              <span class="badge-icon">${icons.sparkles(16)}</span>
              <span>Conceived & Developed by ALTRIVELLE TECHNOLOGIES</span>
            </div>

            <h1 class="hero-headline">
              One Link. <span class="gradient-text">Smarter Sharing.</span>
            </h1>

            <p class="hero-subtext">
              Send files. Receive files. Control access. Automate everything. An industrial-grade, zero-trust file delivery engine engineered for maximum security, instantaneous peer-to-peer tunnels, and developer autonomy.
            </p>

            <div class="hero-cta-group">
              <a href="#dashboard" class="btn btn-primary btn-lg pulse-glow-btn">
                ${icons.uploadCloud(20)} Launch App Dashboard
              </a>
              <a href="#transfers" class="btn btn-outline btn-lg">
                ${icons.share(18)} Direct P2P Device Transfer
              </a>
            </div>

            <!-- Hero Feature Pills -->
            <div class="hero-feature-pills mt-4">
              <span class="pill-item">${icons.shield(14)} Trust Passport &trade; Cryptography</span>
              <span class="pill-item">${icons.sparkles(14)} Direct WebRTC P2P (Zero Cloud)</span>
              <span class="pill-item">${icons.clock(14)} Ephemeral Self-Destruct</span>
              <span class="pill-item">${icons.uploadCloud(14)} Client DropBox Requests</span>
            </div>
          </div>
        </section>

        <!-- Live Architecture & Mode Selector Showcase -->
        <section class="transfer-showcase-matrix mt-5">
          <div class="landing-section-header">
            <span class="landing-section-badge badge-primary">Multi-Mode Routing</span>
            <h2 class="landing-section-title">Adaptive Transfer Engine</h2>
            <p class="landing-section-subtitle">Altrivelle Linker dynamically routes payloads across three specialized zero-trust transfer architectures.</p>
          </div>

          <div class="transfer-modes-grid mt-4">
            <div class="transfer-mode-card glass-panel animate-scale-up">
              <div class="mode-icon-box text-indigo">${icons.share(26)}</div>
              <h3 class="mode-card-title">Direct Device-to-Device</h3>
              <p class="mode-card-desc">Direct WebRTC DataChannel browser-to-browser stream. Gigabytes move at LAN or fiber line rate with zero server storage residency.</p>
              <div class="mode-card-footer">
                <span class="mode-pill">P2P Room Code &bull; 0 KB Cloud</span>
                <a href="#transfers?role=receive" class="btn btn-sm btn-outline btn-block">Enter Room / Send P2P &rarr;</a>
              </div>
            </div>

            <div class="transfer-mode-card glass-panel animate-scale-up">
              <div class="mode-icon-box text-warning">${icons.clock(26)}</div>
              <h3 class="mode-card-title">Ephemeral Self-Destruct</h3>
              <p class="mode-card-desc">Self-immolating shares with strictly enforced burn-after-reading policies or time-bound expiration locks that wipe data immediately.</p>
              <div class="mode-card-footer">
                <span class="mode-pill">Burn After 1 Download</span>
                <a href="#transfers" class="btn btn-sm btn-outline btn-block">Explore Ephemeral &rarr;</a>
              </div>
            </div>

            <div class="transfer-mode-card glass-panel animate-scale-up">
              <div class="mode-icon-box text-emerald">${icons.hardDrive(26)}</div>
              <h3 class="mode-card-title">Persistent Cloud Storage</h3>
              <p class="mode-card-desc">Cryptographically verified, owner-scoped Supabase object storage with signed download URLs, fine-grained access, and SHA-256 provenance.</p>
              <div class="mode-card-footer">
                <span class="mode-pill">High Availability &bull; Encrypted</span>
                <a href="#files" class="btn btn-sm btn-outline btn-block">Manage Cloud Files &rarr;</a>
              </div>
            </div>
          </div>
        </section>

        <!-- Four Flagship Innovations -->
        <section class="landing-pillars-section mt-5">
          <div class="landing-section-header">
            <span class="landing-section-badge badge-success">Built for Performance</span>
            <h2 class="landing-section-title">The Four Flagship Innovations</h2>
            <p class="landing-section-subtitle">Engineered to transcend generic cloud storage with verifiable integrity and developer workflows</p>
          </div>

          <div class="pillars-grid mt-4">
            <div class="pillar-card glass-panel animate-scale-up">
              <div class="pillar-icon text-primary">${icons.sparkles(28)}</div>
              <h3 class="pillar-card-title">Adaptive Transfer</h3>
              <p class="pillar-card-desc">Intelligently balances bandwidth, recipient presence, and file sensitivity to select between Persistent, Ephemeral, and Direct P2P.</p>
            </div>

            <div class="pillar-card glass-panel animate-scale-up">
              <div class="pillar-icon text-indigo">${icons.shield(28)}</div>
              <h3 class="pillar-card-title">Trust Passport &trade;</h3>
              <p class="pillar-card-desc">Transparent cryptographic security card showing SHA-256 integrity checksums, expiration countdowns, and quota metrics for every shared link.</p>
            </div>

            <div class="pillar-card glass-panel animate-scale-up">
              <div class="pillar-icon text-emerald">${icons.uploadCloud(28)}</div>
              <h3 class="pillar-card-title">DropBox File Requests</h3>
              <p class="pillar-card-desc">Generate isolated client upload links. External stakeholders can drop deliverables directly into your storage without creating an account.</p>
            </div>

            <div class="pillar-card glass-panel animate-scale-up">
              <div class="pillar-icon text-purple">${icons.hardDrive(28)}</div>
              <h3 class="pillar-card-title">Developer Flow & CLI</h3>
              <p class="pillar-card-desc">Full REST API, official CLI binary tool, and HMAC-SHA256 signed webhooks to seamlessly automate your CI/CD delivery pipelines.</p>
            </div>
          </div>
        </section>

        <!-- Pricing in Indian Rupees (INR) Showcase -->
        <section class="pricing-showcase-section mt-5">
          <div class="landing-section-header">
            <span class="landing-section-badge badge-project">Transparent Indian Rupee (₹ INR) Pricing</span>
            <h2 class="landing-section-title">Predictable Plans for Indian Innovators</h2>
            <p class="landing-section-subtitle">No foreign exchange surcharges. Honest quotas with full self-hosting freedom.</p>
          </div>

          <div class="pricing-cards-grid mt-4">
            <!-- Community -->
            <div class="pricing-card glass-panel animate-scale-up">
              <div class="plan-header">
                <span class="badge badge-success">${SUBSCRIPTION_PLANS.community.badge}</span>
                <h3 class="plan-name">${SUBSCRIPTION_PLANS.community.name}</h3>
                <div class="plan-price">
                  <span class="price-val font-mono">${SUBSCRIPTION_PLANS.community.price}</span>
                  <span class="price-period">${SUBSCRIPTION_PLANS.community.interval}</span>
                </div>
                <p class="plan-desc">${SUBSCRIPTION_PLANS.community.description}</p>
              </div>
              <div class="plan-features-list">
                <ul>
                  ${SUBSCRIPTION_PLANS.community.features.map(f => `<li>${icons.check(14)} <span>${f}</span></li>`).join('')}
                </ul>
              </div>
              <div class="plan-cta-box">
                <a href="#dashboard" class="btn btn-outline btn-block">Included Default</a>
              </div>
            </div>

            <!-- Pro -->
            <div class="pricing-card pro-card glass-panel animate-scale-up">
              <div class="popular-ribbon">⭐ Most Popular</div>
              <div class="plan-header">
                <span class="badge badge-project">${SUBSCRIPTION_PLANS.pro.badge}</span>
                <h3 class="plan-name">${SUBSCRIPTION_PLANS.pro.name}</h3>
                <div class="plan-price">
                  <span class="price-val font-mono">${SUBSCRIPTION_PLANS.pro.price}</span>
                  <span class="price-period">${SUBSCRIPTION_PLANS.pro.interval}</span>
                </div>
                <p class="plan-desc">${SUBSCRIPTION_PLANS.pro.description}</p>
              </div>
              <div class="plan-features-list">
                <ul>
                  ${SUBSCRIPTION_PLANS.pro.features.slice(0, 5).map(f => `<li>${icons.check(14)} <span>${f}</span></li>`).join('')}
                </ul>
              </div>
              <div class="plan-cta-box">
                <a href="#plans" class="btn btn-primary btn-block">Upgrade to Pro (${SUBSCRIPTION_PLANS.pro.price})</a>
              </div>
            </div>

            <!-- Team -->
            <div class="pricing-card glass-panel animate-scale-up">
              <div class="plan-header">
                <span class="badge badge-subtle">${SUBSCRIPTION_PLANS.team.badge}</span>
                <h3 class="plan-name">${SUBSCRIPTION_PLANS.team.name}</h3>
                <div class="plan-price">
                  <span class="price-val font-mono">${SUBSCRIPTION_PLANS.team.price}</span>
                  <span class="price-period">${SUBSCRIPTION_PLANS.team.interval}</span>
                </div>
                <p class="plan-desc">${SUBSCRIPTION_PLANS.team.description}</p>
              </div>
              <div class="plan-features-list">
                <ul>
                  ${SUBSCRIPTION_PLANS.team.features.slice(0, 5).map(f => `<li>${icons.check(14)} <span>${f}</span></li>`).join('')}
                </ul>
              </div>
              <div class="plan-cta-box">
                <a href="#plans" class="btn btn-outline btn-block">View Team Quotas</a>
              </div>
            </div>
          </div>
        </section>

        <!-- Company Showcase Banner -->
        <section class="company-showcase-section mt-5 mb-5">
          <div class="company-banner-card glass-panel text-center animate-fade-in">
            <div class="company-banner-logo-wrap">
              <img src="/assets/altrivelle-linker-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="company-banner-logo" onerror="this.style.display='none'" />
            </div>
            <h2 class="company-banner-name">ALTRIVELLE TECHNOLOGIES</h2>
            <p class="company-banner-tagline">Think Beyond. Build Forward.</p>
            <p class="company-banner-manifesto mt-3">
              We design software platforms that prioritize data sovereignty, cryptographic integrity, user autonomy, and industrial developer elegance. Altrivelle Linker is built for creators, teams, and enterprises across India and worldwide.
            </p>
            <div class="mt-4 flex-center gap-3 company-banner-actions">
              <a href="#dashboard" class="btn btn-primary btn-lg">
                Enter App Dashboard
              </a>
              <a href="#plans" class="btn btn-outline btn-lg">
                Explore All Plans (₹ INR)
              </a>
            </div>
          </div>
        </section>
      </div>
    `;
  },
};
