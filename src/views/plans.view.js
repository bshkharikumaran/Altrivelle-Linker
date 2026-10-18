// ==============================================================================
// Altrivelle Linker — Subscription Plans & Entitlements View
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { SUBSCRIPTION_PLANS } from '../config/plans.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

export const plansView = {
  render(container) {
    container.innerHTML = `
      <div class="plans-page animate-fade-in">
        <div class="view-header text-center mx-auto" style="max-width: 700px;">
          <div>
            <h1 class="view-title">Subscription Plans & Entitlements</h1>
            <p class="view-subtitle">Transparent quotas for individual creators, teams, and self-hosted environments. Engineered with zero-trust storage isolation.</p>
          </div>
        </div>

        <!-- Plans Grid -->
        <div class="pricing-cards-grid mt-4">
          <!-- Community Plan -->
          <div class="pricing-card current-plan-card glass-panel animate-scale-up">
            <div class="plan-header">
              <span class="badge badge-success">${SUBSCRIPTION_PLANS.community.badge}</span>
              <h3 class="plan-name">${SUBSCRIPTION_PLANS.community.name}</h3>
              <div class="plan-price">
                <span class="price-val">${SUBSCRIPTION_PLANS.community.price}</span>
                <span class="price-period">${SUBSCRIPTION_PLANS.community.interval}</span>
              </div>
              <p class="plan-desc">${SUBSCRIPTION_PLANS.community.description}</p>
            </div>
            <div class="plan-features-list">
              <ul>
                ${SUBSCRIPTION_PLANS.community.features.map((f) => `<li>${icons.check(14)} ${f}</li>`).join('')}
              </ul>
            </div>
            <div class="plan-cta-box">
              <button type="button" class="btn btn-outline btn-block" disabled>Current Active Plan</button>
            </div>
          </div>

          <!-- Pro Plan -->
          <div class="pricing-card pro-card glass-panel animate-scale-up">
            <div class="plan-header">
              <span class="badge badge-project">${SUBSCRIPTION_PLANS.pro.badge}</span>
              <h3 class="plan-name">${SUBSCRIPTION_PLANS.pro.name}</h3>
              <div class="plan-price">
                <span class="price-val">${SUBSCRIPTION_PLANS.pro.price}</span>
                <span class="price-period">${SUBSCRIPTION_PLANS.pro.interval}</span>
              </div>
              <p class="plan-desc">${SUBSCRIPTION_PLANS.pro.description}</p>
            </div>
            <div class="plan-features-list">
              <ul>
                ${SUBSCRIPTION_PLANS.pro.features.map((f) => `<li>${icons.check(14)} ${f}</li>`).join('')}
              </ul>
            </div>
            <div class="plan-cta-box">
              <button type="button" class="btn btn-primary btn-block btn-upgrade" data-plan="pro">Upgrade to Pro</button>
            </div>
          </div>

          <!-- Team Plan -->
          <div class="pricing-card glass-panel animate-scale-up">
            <div class="plan-header">
              <span class="badge badge-subtle">${SUBSCRIPTION_PLANS.team.badge}</span>
              <h3 class="plan-name">${SUBSCRIPTION_PLANS.team.name}</h3>
              <div class="plan-price">
                <span class="price-val">${SUBSCRIPTION_PLANS.team.price}</span>
                <span class="price-period">${SUBSCRIPTION_PLANS.team.interval}</span>
              </div>
              <p class="plan-desc">${SUBSCRIPTION_PLANS.team.description}</p>
            </div>
            <div class="plan-features-list">
              <ul>
                ${SUBSCRIPTION_PLANS.team.features.map((f) => `<li>${icons.check(14)} ${f}</li>`).join('')}
              </ul>
            </div>
            <div class="plan-cta-box">
              <button type="button" class="btn btn-outline btn-block btn-upgrade" data-plan="team">Contact for Teams</button>
            </div>
          </div>

          <!-- Self-Hosted Plan -->
          <div class="pricing-card glass-panel animate-scale-up">
            <div class="plan-header">
              <span class="badge badge-success">${SUBSCRIPTION_PLANS.self_hosted.badge}</span>
              <h3 class="plan-name">${SUBSCRIPTION_PLANS.self_hosted.name}</h3>
              <div class="plan-price">
                <span class="price-val">${SUBSCRIPTION_PLANS.self_hosted.price}</span>
                <span class="price-period">${SUBSCRIPTION_PLANS.self_hosted.interval}</span>
              </div>
              <p class="plan-desc">${SUBSCRIPTION_PLANS.self_hosted.description}</p>
            </div>
            <div class="plan-features-list">
              <ul>
                ${SUBSCRIPTION_PLANS.self_hosted.features.map((f) => `<li>${icons.check(14)} ${f}</li>`).join('')}
              </ul>
            </div>
            <div class="plan-cta-box">
              <a href="#settings" class="btn btn-outline btn-block">Read Self-Hosting Docs</a>
            </div>
          </div>
        </div>

        <div class="section-card mt-5 text-center">
          <h4>Open Source Commitment by ALTRIVELLE TECHNOLOGIES</h4>
          <p class="text-muted text-sm mt-1">
            The core engine of Altrivelle Linker is open-source. Self-hosting requires no subscription fees. Enterprise support, multi-tenant billing, and dedicated cloud hosting are provided by ALTRIVELLE TECHNOLOGIES.
          </p>
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-upgrade').forEach((btn) => {
      btn.addEventListener('click', () => {
        toast.info(`Billing integration: Plan ${btn.dataset.plan.toUpperCase()} request recorded. Payment gateway is unconfigured in development mode.`);
      });
    });
  },
};
