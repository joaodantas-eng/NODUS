/**
 * Componente padronizado de Modal estilo macOS
 * Fornece mesma linguagem visual, campos bem espaçados,
 * botão principal claro, botão cancelar, validação e fechamento com Esc.
 */
import { getIcon } from '../utils/icons.js';

export function openModal({
  title,
  contentHtml,
  confirmText = 'Salvar',
  cancelText = 'Cancelar',
  onConfirm = async () => true,
  onOpen = () => {}
}) {
  // Remove qualquer modal prévio
  const existing = document.getElementById('app-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'app-modal-overlay';

  overlay.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true" id="app-modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button type="button" class="modal-close-btn" id="modal-btn-close" title="Fechar (Esc)">
          ${getIcon('close')}
        </button>
      </div>
      <div class="modal-body" id="modal-body-content">
        ${contentHtml}
        <div class="modal-error-message" id="modal-error-msg" style="display: none;"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary btn-sm" id="modal-btn-cancel">
          ${cancelText}
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="modal-btn-confirm">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animação de entrada suave
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  const closeModal = () => {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      overlay.remove();
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') {
      // Confirmação com Enter em inputs de texto
      e.preventDefault();
      confirmBtn?.click();
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  // Fechar ao clicar fora
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  overlay.querySelector('#modal-btn-close')?.addEventListener('click', closeModal);
  overlay.querySelector('#modal-btn-cancel')?.addEventListener('click', closeModal);

  // Confirmação com validação
  const confirmBtn = overlay.querySelector('#modal-btn-confirm');
  const errorMsgEl = overlay.querySelector('#modal-error-msg');

  confirmBtn?.addEventListener('click', async () => {
    if (errorMsgEl) {
      errorMsgEl.style.display = 'none';
      errorMsgEl.textContent = '';
    }

    try {
      confirmBtn.setAttribute('disabled', 'true');
      const success = await onConfirm({
        dialog: overlay.querySelector('#app-modal-dialog'),
        setError: (msg) => {
          if (errorMsgEl) {
            errorMsgEl.textContent = msg;
            errorMsgEl.style.display = 'block';
          }
        }
      });

      if (success !== false) {
        closeModal();
      }
    } catch (err) {
      if (errorMsgEl) {
        errorMsgEl.textContent = err.message || 'Ocorreu um erro ao salvar.';
        errorMsgEl.style.display = 'block';
      }
    } finally {
      confirmBtn.removeAttribute('disabled');
    }
  });

  // Executa callback onOpen após anexar no DOM
  const dialogEl = overlay.querySelector('#app-modal-dialog');
  if (dialogEl) {
    dialogEl.dialog = dialogEl;
    dialogEl.close = closeModal;
  }
  if (typeof onOpen === 'function') {
    try {
      onOpen(dialogEl);
    } catch (err) {
      console.error('Erro no callback onOpen do modal:', err);
    }
  }

  // Foco no primeiro input
  const firstInput = overlay.querySelector('input, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 50);
  }

  return { close: closeModal };
}

export function confirmModal({
  title = 'Confirmar Exclusão',
  message = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  onConfirm = async () => true
}) {
  return openModal({
    title,
    contentHtml: `<p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.6; margin: 8px 0;">${message}</p>`,
    confirmText,
    cancelText,
    onOpen: ({ dialog }) => {
      const btn = dialog.querySelector('#modal-btn-confirm');
      if (btn) {
        btn.style.backgroundColor = 'var(--danger)';
        btn.style.borderColor = 'var(--danger)';
        btn.style.color = '#FFFFFF';
      }
    },
    onConfirm
  });
}
