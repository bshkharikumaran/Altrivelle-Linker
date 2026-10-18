// FileLink Theme Controller (Light/Dark Mode)
export const themeManager = {
  currentTheme: 'light',

  init() {
    const savedTheme = localStorage.getItem('altrivelle_theme') || localStorage.getItem('filelink_theme');
    // Default appearance is Dark theme per Altrivelle industrial tech standards
    this.currentTheme = savedTheme || 'dark';
    this.applyTheme(this.currentTheme);
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('altrivelle_theme', theme);
    localStorage.setItem('filelink_theme', theme);

    // Update any theme toggles in DOM
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    themeButtons.forEach((btn) => {
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      btn.setAttribute('data-theme', theme);
    });
  },

  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    return newTheme;
  },

  isDark() {
    return this.currentTheme === 'dark';
  },
};
