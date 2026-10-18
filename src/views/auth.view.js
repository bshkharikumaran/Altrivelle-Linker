import { authService } from '../services/auth.service.js';
import { toast } from '../ui/toast.js';
import { APP_CONFIG } from '../config.js';
import { icons } from '../ui/icons.js';

export const authView = {
  currentTab: 'signin', // 'signin', 'signup', 'forgot'

  render(container) {
    container.innerHTML = `
      <div class="auth-page-wrapper">
        <div class="auth-background-glow glow-1"></div>
        <div class="auth-background-glow glow-2"></div>

        <div class="auth-card-container">
          <div class="auth-card glass-panel animate-scale-up">
            <!-- Brand Header -->
            <div class="auth-brand-header">
              <div class="auth-brand-logo-badge">
                ${icons.logo(28, 'text-primary')}
              </div>
              <h1 class="auth-app-title">FileLink</h1>
              <p class="auth-app-subtitle">Modern File Hosting & Project Sharing Platform</p>
            </div>

            <!-- Auth Tabs -->
            <div class="auth-tabs" id="auth-tabs-bar">
              <button class="auth-tab-btn ${this.currentTab === 'signin' ? 'active' : ''}" data-tab="signin">
                Sign In
              </button>
              <button class="auth-tab-btn ${this.currentTab === 'signup' ? 'active' : ''}" data-tab="signup">
                Create Account
              </button>
            </div>

            <!-- Config Warning if Supabase is missing -->
            ${
              !APP_CONFIG.isConfigured()
                ? `
                <div class="supabase-notice-banner">
                  <div class="notice-icon">${icons.shield(20)}</div>
                  <div class="notice-text">
                    <strong>Setup Needed:</strong> Add your Supabase project keys to <code>.env</code> to enable live cloud authentication & storage.
                  </div>
                </div>
              `
                : ''
            }

            <!-- Form Container -->
            <form id="auth-form" class="auth-form">
              <div id="auth-form-fields">
                ${this.renderFields()}
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-auth-submit" id="auth-submit-btn">
                <span class="btn-text">${this.getSubmitText()}</span>
                <span class="btn-spinner hidden"></span>
              </button>
            </form>

            <!-- Forgot Password link -->
            <div class="auth-footer-links">
              ${
                this.currentTab === 'signin'
                  ? `<button type="button" class="link-btn" id="link-forgot-pw">Forgot your password?</button>`
                  : this.currentTab === 'forgot'
                  ? `<button type="button" class="link-btn" id="link-back-login">Back to Sign In</button>`
                  : ''
              }
            </div>

            <!-- Subtle Company Credit Requirement -->
            <div class="auth-company-credit">
              <img src="/assets/altrivelle-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="auth-company-logo" onerror="this.style.display='none'" />
              <div class="auth-company-text">
                <span class="credit-label">Developed by</span>
                <span class="company-name">ALTRIVELLE TECHNOLOGIES</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  renderFields() {
    if (this.currentTab === 'signin') {
      return `
        <div class="form-group">
          <label for="auth-email">Email Address</label>
          <div class="input-with-icon">
            <input type="email" id="auth-email" required placeholder="name@company.com" autocomplete="email" />
          </div>
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <div class="input-with-icon">
            <input type="password" id="auth-password" required placeholder="••••••••" autocomplete="current-password" />
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'signup') {
      return `
        <div class="form-group">
          <label for="auth-name">Full Name</label>
          <input type="text" id="auth-name" required placeholder="Alex Rivera" autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="auth-email">Email Address</label>
          <input type="email" id="auth-email" required placeholder="name@company.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" required minlength="6" placeholder="At least 6 characters" autocomplete="new-password" />
        </div>
      `;
    }

    if (this.currentTab === 'forgot') {
      return `
        <div class="form-group">
          <label for="auth-email">Enter your account email</label>
          <input type="email" id="auth-email" required placeholder="name@company.com" />
        </div>
        <p class="form-hint">We will send a password reset link to your email address.</p>
      `;
    }

    return '';
  },

  getSubmitText() {
    if (this.currentTab === 'signin') return 'Sign In to FileLink';
    if (this.currentTab === 'signup') return 'Create Free Account';
    if (this.currentTab === 'forgot') return 'Send Reset Link';
    return 'Submit';
  },

  bindEvents(container) {
    // Tab switching
    const tabBtns = container.querySelectorAll('.auth-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        this.render(container);
      });
    });

    const forgotLink = container.querySelector('#link-forgot-pw');
    if (forgotLink) {
      forgotLink.addEventListener('click', () => {
        this.currentTab = 'forgot';
        this.render(container);
      });
    }

    const backLoginLink = container.querySelector('#link-back-login');
    if (backLoginLink) {
      backLoginLink.addEventListener('click', () => {
        this.currentTab = 'signin';
        this.render(container);
      });
    }

    // Submit handler
    const form = container.querySelector('#auth-form');
    const submitBtn = container.querySelector('#auth-submit-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = container.querySelector('#auth-email')?.value.trim();
        const password = container.querySelector('#auth-password')?.value;
        const name = container.querySelector('#auth-name')?.value.trim();

        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Processing...';

        try {
          if (this.currentTab === 'signin') {
            await authService.signIn(email, password);
            toast.success('Welcome back to FileLink!');
            window.location.hash = '#dashboard';
          } else if (this.currentTab === 'signup') {
            await authService.signUp(email, password, name);
            toast.success('Account created! Please check your email to confirm or sign in.');
            this.currentTab = 'signin';
            this.render(container);
          } else if (this.currentTab === 'forgot') {
            await authService.resetPassword(email);
            toast.success('Password reset link sent to your email.');
            this.currentTab = 'signin';
            this.render(container);
          }
        } catch (err) {
          console.error('Auth error:', err);
          toast.error(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.querySelector('.btn-text').textContent = this.getSubmitText();
        }
      });
    }
  },
};
