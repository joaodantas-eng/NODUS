/**
 * Sistema de Notificações Rápidas (Toast) estilo macOS
 * Feedback discreto, não-intrusivo e de curta duração para ações do usuário
 */
import { getIcon } from '../utils/icons.js';

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.id = 'app-toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Exibe uma mensagem de feedback discreta
 * @param {string} message - Texto da notificação
 * @param {string} type - 'info' | 'success' | 'warning'
 * @param {number} durationMs - Duração em milissegundos (padrão: 2200ms)
 */
export function showToast(message, type = 'success', durationMs = 2200) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  
  let iconName = 'check';
  if (type === 'warning') iconName = 'alert';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <span class="toast-icon">${getIcon(iconName)}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Remoção suave
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
        toastContainer = null;
      }
    }, 200);
  }, durationMs);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
