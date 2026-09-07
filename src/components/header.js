/**
 * Componente do Cabeçalho Superior da Janela (Estilo EscapeFlow / macOS)
 */
import { StorageService } from '../services/storageService.js';
import { getFormattedCurrentDate } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';

export function createHeader(route, onNavigate) {
  const header = document.createElement('header');
  header.className = 'top-header';
  header.id = 'app-header';

  const titles = {
    dashboard: 'Home',
    krux: 'Krux — Inteligência & Foco',
    kore: 'Krux — Inteligência & Foco',
    tasks: 'Tarefas',
    agenda: 'Agenda',
    finances: 'Finanças',
    challenges: 'Desafios',
    habits: 'Hábitos',
    workouts: 'Treinos',
    content: 'Conteúdo',
    notes: 'Notas',
    reading: 'Leitura',
    diary: 'Diário',
    profile: 'Perfil e Configurações'
  };

  const title = titles[route] || 'Home';
  const data = StorageService.getData();
  const challenges = data.challenges || [];
  const challenge = challenges.find(c => c.active) || challenges[0] || {
    daysTotal: 21,
    title: 'Desafio Nodus 21',
    checkins: []
  };
  const totalDays = parseInt(challenge.daysTotal) || 21;
  const daysDone = (challenge.checkins || []).length;
  const daysRemaining = Math.max(0, totalDays - daysDone);

  header.innerHTML = `
    <div class="header-title-group">
      <h1 id="header-title">${title}</h1>
    </div>

    <div class="header-actions" id="header-actions">
      <!-- Banner de Desafio Ativo -->
      <button class="header-challenge-badge" id="header-challenge-btn" title="Ver ${escapeHtml(challenge.title || 'Desafio')}">
        <span class="challenge-flame">🔥</span>
        <span class="challenge-text">${daysRemaining} dias restantes do ${escapeHtml(challenge.title || 'Desafio Nodus')}</span>
      </button>

      <!-- Botão Rápido Krux -->
      ${route !== 'krux' && route !== 'kore' ? `
      <button class="header-kore-btn header-krux-btn" id="header-krux-btn" title="Conversar com Krux">
        ${getIcon('krux') || getIcon('kore')}
        <span>Krux</span>
      </button>` : ''}

      <div class="header-divider-v"></div>

      <span class="header-date-pill">${getFormattedCurrentDate()}</span>
    </div>
  `;

  // Ouvintes de ação no cabeçalho
  const challengeBtn = header.querySelector('#header-challenge-btn');
  if (challengeBtn && onNavigate) {
    challengeBtn.addEventListener('click', () => {
      onNavigate('challenges');
    });
  }

  const kruxBtn = header.querySelector('#header-krux-btn') || header.querySelector('#header-kore-btn');
  if (kruxBtn && onNavigate) {
    kruxBtn.addEventListener('click', () => {
      onNavigate('krux');
    });
  }

  return header;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
