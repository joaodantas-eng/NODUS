/**
 * Componente da Sidebar Lateral (Estilo EscapeFlow / macOS Desktop)
 * Completa, retrátil, com 2 seções, menu "+ Adicionar" e perfil de usuário
 */
import { StorageService } from '../services/storageService.js';
import { getTodayDateString } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';

export function createSidebar({ activeRoute, onNavigate }) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'app-sidebar';

  // Verifica estado salvo de colapso
  const isCollapsed = (localStorage.getItem('nodus_sidebar_collapsed') || localStorage.getItem('escapeflow_sidebar_collapsed')) === 'true';
  if (isCollapsed) {
    sidebar.classList.add('sidebar-collapsed');
  }

  const data = StorageService.getData();
  const settings = StorageService.getSettings();
  const user = settings.user || { name: '', username: '' };
  const menuItems = settings.menuItems || {
    habits: true,
    workouts: true,
    content: true,
    notes: true,
    reading: true,
    diary: true
  };

  const pendingTasks = (data.tasks || []).filter(t => !t.completed).length;
  const today = getTodayDateString();
  const pendingHabits = (data.habits || []).filter(h => !(h.completedDates || []).includes(today)).length;

  sidebar.innerHTML = `
    <div class="sidebar-top">
      <div class="sidebar-brand-row">
        <div class="app-brand" data-route="dashboard" title="Nodus">
          <div class="brand-logo-mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#1C1C22"/>
              <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" stroke="#2E2E38" stroke-width="1"/>
              <path d="M7 17V7L14 17V7" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="18" cy="16.2" r="1.6" fill="#FF5A1F"/>
            </svg>
          </div>
          <span class="brand-text">nodus<span class="brand-dot">.</span></span>
        </div>
        <button class="btn-toggle-sidebar" id="btn-toggle-sidebar" title="Recolher / Expandir barra lateral">
          ${getIcon('panelLeft')}
        </button>
      </div>
    </div>

    <div class="sidebar-scroll-area">
      <!-- Seção Principal -->
      <nav class="nav-menu" id="sidebar-nav-main">
        <a class="nav-item ${activeRoute === 'dashboard' ? 'active' : ''}" data-route="dashboard" id="nav-dashboard" title="Home">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('home')}</span>
            <span class="nav-label">Home</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'krux' || activeRoute === 'kore' ? 'active' : ''}" data-route="krux" id="nav-krux" title="Krux">
          <div class="nav-left">
            <span class="nav-icon text-accent">${getIcon('krux') || getIcon('kore')}</span>
            <span class="nav-label">Krux</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'tasks' ? 'active' : ''}" data-route="tasks" id="nav-tasks" title="Tarefas">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('tasks')}</span>
            <span class="nav-label">Tarefas</span>
          </div>
          ${pendingTasks > 0 ? `<span class="nav-badge" id="badge-tasks">${pendingTasks}</span>` : ''}
        </a>

        <a class="nav-item ${activeRoute === 'agenda' ? 'active' : ''}" data-route="agenda" id="nav-agenda" title="Agenda">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('agenda')}</span>
            <span class="nav-label">Agenda</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'finances' ? 'active' : ''}" data-route="finances" id="nav-finances" title="Finanças">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('finances')}</span>
            <span class="nav-label">Finanças</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'challenges' ? 'active' : ''}" data-route="challenges" id="nav-challenges" title="Desafios">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('challenges')}</span>
            <span class="nav-label">Desafios</span>
          </div>
        </a>
      </nav>

      <!-- Divisor Visual Sutil -->
      <div class="sidebar-divider"></div>

      <!-- Segunda Seção (Módulos de Produtividade) -->
      <nav class="nav-menu" id="sidebar-nav-secondary">
        <a class="nav-item ${activeRoute === 'habits' ? 'active' : ''}" data-route="habits" id="nav-habits" title="Hábitos">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('habits')}</span>
            <span class="nav-label">Hábitos</span>
          </div>
          ${pendingHabits > 0 ? `<span class="nav-badge" id="badge-habits">${pendingHabits}</span>` : ''}
        </a>

        <a class="nav-item ${activeRoute === 'workouts' ? 'active' : ''}" data-route="workouts" id="nav-workouts" title="Treinos">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('workouts')}</span>
            <span class="nav-label">Treinos</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'content' ? 'active' : ''}" data-route="content" id="nav-content" title="Conteúdo">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('content')}</span>
            <span class="nav-label">Conteúdo</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'notes' ? 'active' : ''}" data-route="notes" id="nav-notes" title="Notas">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('notes')}</span>
            <span class="nav-label">Notas</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'reading' ? 'active' : ''}" data-route="reading" id="nav-reading" title="Leitura">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('reading')}</span>
            <span class="nav-label">Leitura</span>
          </div>
        </a>

        <a class="nav-item ${activeRoute === 'diary' ? 'active' : ''}" data-route="diary" id="nav-diary" title="Diário">
          <div class="nav-left">
            <span class="nav-icon">${getIcon('diary')}</span>
            <span class="nav-label">Diário</span>
          </div>
        </a>
      </nav>
    </div>

    <!-- Perfil do Usuário no Rodapé -->
    <div class="sidebar-footer">
      <div class="user-profile-card ${activeRoute === 'profile' ? 'active' : ''}" id="sidebar-user-profile" title="Abrir perfil e configurações">
        <div class="user-avatar">
          <span>${user.name ? user.name.slice(0, 2).toUpperCase() : 'ND'}</span>
        </div>
        <div class="user-info">
          <div class="user-name">${user.name || 'Meu Perfil'}</div>
        </div>
      </div>
    </div>
  `;

  // Toggle Recolher/Expandir
  const toggleBtn = sidebar.querySelector('#btn-toggle-sidebar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('sidebar-collapsed');
      const collapsed = sidebar.classList.contains('sidebar-collapsed');
      localStorage.setItem('nodus_sidebar_collapsed', String(collapsed));
    });
  }

  // Ouvintes de clique de navegação
  sidebar.querySelectorAll('.nav-item[data-route], .app-brand[data-route]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const route = item.getAttribute('data-route');
      if (route && onNavigate) {
        onNavigate(route);
      }
    });
  });

  // Perfil clicável
  const profileCard = sidebar.querySelector('#sidebar-user-profile');
  if (profileCard) {
    profileCard.addEventListener('click', (e) => {
      e.preventDefault();
      if (onNavigate) {
        onNavigate('profile');
      }
    });
  }

  return sidebar;
}
