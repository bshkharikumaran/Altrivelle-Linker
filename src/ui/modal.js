// Accessible Modal System
class ModalManager {
  constructor() {
    this.container = null;
    this.activeModal = null;
    this.previousActiveElement = null;
    this.init();
  }

  init() {
    if (document.getElementById('modal-root')) {
      this.container = document.getElementById('modal-root');
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'modal-root';
    this.container.className = 'modal-root hidden';
    document.body.appendChild(this.container);

    // Escape key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close();
      }
    });

    // Backdrop click listener
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container || e.target.classList.contains('modal-backdrop')) {
        this.close();
      }
    });
  }

  open(contentHtml, options = {}) {
    this.init();
    this.previousActiveElement = document.activeElement;

    const {
      maxWidth = 'max-w-lg',
      onClose = null,
      showCloseBtn = true,
      title = '',
    } = options;

    this.onCloseCallback = onClose;

    this.container.innerHTML = `
      <div class="modal-backdrop animate-fade-in"></div>
      <div class="modal-wrapper animate-scale-up ${maxWidth}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          ${showCloseBtn ? `<button type="button" class="modal-close-btn" aria-label="Close modal">&times;</button>` : ''}
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    this.container.classList.remove('hidden');
    this.activeModal = true;
    document.body.classList.add('overflow-hidden');

    // Focus the first input or the close button
    const focusable = this.container.querySelector('input, button, select, textarea');
    if (focusable) focusable.focus();

    return this.container.querySelector('.modal-body');
  }

  close() {
    if (!this.activeModal) return;

    this.container.classList.add('hidden');
    this.container.innerHTML = '';
    this.activeModal = null;
    document.body.classList.remove('overflow-hidden');

    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
    }
  }
}

export const modal = new ModalManager();
