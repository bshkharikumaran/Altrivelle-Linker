import { authService } from '../services/auth.service.js';
import { toast } from '../ui/toast.js';
import { APP_CONFIG } from '../config.js';
import { icons } from '../ui/icons.js';

export const authView = {
  currentTab: 'signin', // 'signin', 'signup', 'forgot'
  passwordVisible: false,

  render(container) {
    container.innerHTML = `
      <div class="auth-page-wrapper">
        <div class="auth-background-glow glow-1"></div>
        <div class="auth-background-glow glow-2"></div>

        <div class="auth-card-container">
          <div class="auth-card glass-panel animate-scale-up">
            <!-- Brand Header -->
            <div class="auth-brand-header">
              <a href="#showcase" class="auth-brand-logo-link">
                <img src="/assets/altrivelle-linker-logo.png" alt="Altrivelle Linker" class="auth-brand-logo-img" onerror="this.style.display='none'" />
              </a>
              <h1 class="auth-app-title">Altrivelle Linker</h1>
              <p class="auth-app-company">ALTRIVELLE TECHNOLOGIES</p>
              <p class="auth-app-subtitle">Zero-Trust File Hosting & Adaptive High-Speed Sharing</p>
            </div>

            <!-- Auth Mode Tabs -->
            <div class="auth-tabs" id="auth-tabs-bar">
              <button class="auth-tab-btn ${this.currentTab === 'signin' ? 'active' : ''}" data-tab="signin">
                ${icons.logIn(15)} <span>Sign In</span>
              </button>
              <button class="auth-tab-btn ${this.currentTab === 'signup' ? 'active' : ''}" data-tab="signup">
                ${icons.userPlus(15)} <span>Create Account</span>
              </button>
            </div>

            <!-- Notice if Supabase not configured -->
            ${
              !APP_CONFIG.isConfigured()
                ? `
                <div class="supabase-notice-banner">
                  <div class="notice-icon">${icons.shield(20)}</div>
                  <div class="notice-text">
                    <strong>Notice:</strong> Cloud credentials are required for live Supabase auth. You can still test in Guest mode or configure your cloud keys.
                  </div>
                </div>
              `
                : ''
            }

            <!-- Google OAuth Direct Action -->
            ${
              this.currentTab !== 'forgot'
                ? `
                <div class="auth-social-container">
                  <button type="button" class="btn btn-google-auth btn-block flex-center gap-2" id="btn-google-auth" title="Sign in with your Google account">
                    <span class="google-icon-wrapper">${icons.google(20)}</span>
                    <span class="btn-text">Continue with Google</span>
                    <span class="btn-spinner hidden"></span>
                  </button>
                  <div class="auth-divider">
                    <span>OR CONTINUE WITH EMAIL</span>
                  </div>
                </div>
              `
                : ''
            }

            <!-- Auth Form -->
            <form id="auth-form" class="auth-form" novalidate>
              <div id="auth-form-fields">
                ${this.renderFields()}
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-auth-submit" id="auth-submit-btn">
                <span class="btn-text">${this.getSubmitText()}</span>
                <span class="btn-spinner hidden"></span>
              </button>
            </form>

            <!-- Forgot Password / Switch links -->
            <div class="auth-footer-links">
              ${
                this.currentTab === 'signin'
                  ? `<button type="button" class="link-btn" id="link-forgot-pw">Forgot your password?</button>`
                  : this.currentTab === 'forgot'
                  ? `<button type="button" class="link-btn" id="link-back-login">Back to Sign In</button>`
                  : `<span class="text-xs text-muted">By signing up, you agree to Altrivelle Terms & Privacy.</span>`
              }
            </div>

            <!-- Guest Explorer Mode Option -->
            <div class="auth-divider">
              <span>OR EXPLORE WITHOUT AN ACCOUNT</span>
            </div>

            <button type="button" class="btn btn-outline btn-block btn-guest-continue" id="btn-auth-guest">
              ${icons.sparkles(16)} <span>Continue as Guest (Explore Platform)</span>
            </button>
            <p class="auth-guest-hint">
              Guest access allows direct device-to-device transfers and public file previewing without signing in.
            </p>

            <!-- Company Requirement Credit -->
            <div class="auth-company-credit">
              <img src="/assets/altrivelle-linker-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="auth-company-logo" onerror="this.style.display='none'" />
              <div class="auth-company-text">
                <span class="credit-label">Developed & Powered by</span>
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
    const pwdType = this.passwordVisible ? 'text' : 'password';
    const pwdToggleIcon = this.passwordVisible ? icons.eyeOff(16) : icons.eye(16);

    if (this.currentTab === 'signin') {
      return `
        <div class="form-group">
          <label for="auth-email">Email Address</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">${icons.mail(18)}</span>
            <input 
              type="email" 
              id="auth-email" 
              class="auth-input" 
              required 
              placeholder="name@company.com" 
              autocomplete="email" 
            />
          </div>
        </div>

        <div class="form-group">
          <label for="auth-password">Password</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">${icons.lock(18)}</span>
            <input 
              type="${pwdType}" 
              id="auth-password" 
              class="auth-input auth-input-pwd" 
              required 
              placeholder="Enter your password" 
              autocomplete="current-password" 
            />
            <button type="button" class="auth-toggle-pwd" id="btn-toggle-pwd" title="Toggle password visibility">
              ${pwdToggleIcon}
            </button>
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'signup') {
      return `
        <div class="form-group">
          <label for="auth-name">Full Name</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">${icons.user(18)}</span>
            <input 
              type="text" 
              id="auth-name" 
              class="auth-input" 
              required 
              placeholder="Alex Rivera" 
              autocomplete="name" 
            />
          </div>
        </div>

        <div class="form-group">
          <label for="auth-email">Work or Personal Email</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">${icons.mail(18)}</span>
            <input 
              type="email" 
              id="auth-email" 
              class="auth-input" 
              required 
              placeholder="name@company.com" 
              autocomplete="email" 
            />
          </div>
        </div>

        <div class="form-group">
          <label for="auth-password">Password (Minimum 6 characters)</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">${icons.lock(18)}</span>
            <input 
              type="${pwdType}" 
              id="auth-password" 
              class="auth-input auth-input-pwd" 
              required 
              minlength="6" 
              placeholder="Choose a strong password" 
              autocomplete="new-password" 
            />
            <button type="button" class="auth-toggle-pwd" id="btn-toggle-pwd" title="Toggle password visibility">
              ${pwdToggleIcon}
            </button>
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'forgot') {
      return `
        <div class="form-group">
          <label for="auth-email">Account Email Address</label>
          <div class="auth-input-wrapper">
            <span class="auth-input-icon">${icons.mail(18)}</span>
            <input 
              type="email" 
              id="auth-email" 
              class="auth-input" 
              required 
              placeholder="name@company.com" 
              autocomplete="email" 
            />
          </div>
        </div>
        <p class="form-hint text-xs text-muted mt-1">We will send a secure password reset link to your email inbox.</p>
      `;
    }

    return '';
  },

  getSubmitText() {
    if (this.currentTab === 'signin') return 'Sign In to Altrivelle Linker';
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

    // Password visibility toggle
    const togglePwdBtn = container.querySelector('#btn-toggle-pwd');
    if (togglePwdBtn) {
      togglePwdBtn.addEventListener('click', () => {
        this.passwordVisible = !this.passwordVisible;
        const pwdInput = container.querySelector('#auth-password');
        if (pwdInput) {
          pwdInput.type = this.passwordVisible ? 'text' : 'password';
          togglePwdBtn.innerHTML = this.passwordVisible ? icons.eyeOff(16) : icons.eye(16);
        }
      });
    }

    // Forgot password links
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

    // Continue as guest button
    const guestBtn = container.querySelector('#btn-auth-guest');
    if (guestBtn) {
      guestBtn.addEventListener('click', () => {
        sessionStorage.setItem('altrivelle_guest_dismissed', 'true');
        toast.info('Exploring Altrivelle Linker in Guest Mode.');
        window.location.hash = '#dashboard';
      });
    }

    // Google OAuth button
    const googleBtn = container.querySelector('#btn-google-auth');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        const btnText = googleBtn.querySelector('.btn-text');
        const spinner = googleBtn.querySelector('.btn-spinner');
        googleBtn.disabled = true;
        if (btnText) btnText.textContent = 'Redirecting to Google...';
        if (spinner) spinner.classList.remove('hidden');

        try {
          await authService.signInWithGoogle();
        } catch (err) {
          console.error('Google Sign-In Error:', err);
          toast.error(err.message || 'Unable to connect to Google authentication.');
          googleBtn.disabled = false;
          if (btnText) btnText.textContent = 'Continue with Google';
          if (spinner) spinner.classList.add('hidden');
        }
      });
    }

    // Form submission
    const form = container.querySelector('#auth-form');
    const submitBtn = container.querySelector('#auth-submit-btn');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = container.querySelector('#auth-email')?.value.trim();
        const password = container.querySelector('#auth-password')?.value;
        const name = container.querySelector('#auth-name')?.value.trim();

        if (!email) {
          toast.warning('Please enter a valid email address.');
          return;
        }

        if (this.currentTab !== 'forgot' && (!password || password.length < 6)) {
          toast.warning('Password must be at least 6 characters long.');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = 'Authenticating...';

        try {
          if (this.currentTab === 'signin') {
            await authService.signIn(email, password);
            toast.success('Welcome back to Altrivelle Linker!');
            window.location.hash = '#dashboard';
          } else if (this.currentTab === 'signup') {
            await authService.signUp(email, password, name);
            toast.success('Account created! Please check your email to verify or sign in.');
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
          toast.error(err.message || 'Authentication failed. Please verify your credentials.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.querySelector('.btn-text').textContent = this.getSubmitText();
        }
      });
    }
  },
};
