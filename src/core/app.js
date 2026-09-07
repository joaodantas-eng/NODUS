/**
 * Gerenciador Principal da Aplicação
 */
import { StorageService } from '../services/storageService.js';
import { Router } from './router.js';
import { createSidebar } from '../components/sidebar.js';
import { createHeader } from '../components/header.js';
import { renderDashboard } from '../modules/dashboard.js';
import { renderKrux, renderKore } from '../modules/krux.js';
import { renderTasks } from '../modules/tasks.js';
import { renderAgenda } from '../modules/agenda.js';
import { renderFinances } from '../modules/finances.js';
import { renderChallenges } from '../modules/challenges.js';
import { renderHabits } from '../modules/habits.js';
import { renderWorkouts } from '../modules/workouts.js';
import { renderContent } from '../modules/content.js';
import { renderNotes } from '../modules/notes.js';
import { renderReading } from '../modules/reading.js';
import { renderDiary } from '../modules/diary.js';
import { renderProfile } from '../modules/profile.js';
import { getTodayDateString } from '../utils/dateUtils.js';

export class App {
  constructor() {
    this.root = document.getElementById('root');
    this.currentRoute = 'dashboard';
    this.sidebarEl = null;
    this.headerEl = null;
    this.viewContainerEl = null;
    this.router = null;
  }

  async init() {
    // Carrega dados do db.json
    await StorageService.loadData();

    // Aplica o tema configurado (Tema Escuro/Claro e Acento de Cor)
    this.applyTheme();

    // Configura container de layout
    this.root.innerHTML = '';
    const appContainer = document.createElement('div');
    appContainer.id = 'app';

    // Cria os elementos de visualização
    const mainContent = document.createElement('main');
    mainContent.className = 'main-content';

    this.viewContainerEl = document.createElement('div');
    this.viewContainerEl.className = 'view-container';
    this.viewContainerEl.id = 'view-content';

    // Inicializa o roteador
    this.router = new Router({
      onRouteChange: (route) => {
        this.handleRouteChange(route);
      }
    });

    this.currentRoute = this.router.getRoute();

    // Renderiza Sidebar
    this.renderSidebar(appContainer);

    // Renderiza Header
    this.headerEl = createHeader(this.currentRoute, (route) => this.router.navigate(route));
    mainContent.appendChild(this.headerEl);
    mainContent.appendChild(this.viewContainerEl);

    appContainer.appendChild(mainContent);
    this.root.appendChild(appContainer);

    // Renderiza a rota atual
    this.renderActiveView();

    // Registra atalhos de teclado (⌘+N para criar tarefa na tela de tarefas, Esc, Enter)
    this.setupKeyboardShortcuts();

    // Inscreve para atualizações do banco de dados (para manter badges e dados atualizados)
    StorageService.subscribe((_data, meta = {}) => {
      this.applyTheme();
      this.updateBadges();
      // Se estiver no dashboard, re-renderiza apenas se não for alteração do plano diário
      // e se o usuário não estiver com foco em nenhum campo de digitação
      if (this.currentRoute === 'dashboard') {
        if (meta?.source === 'daily-plan') {
          return;
        }
        const activeEl = document.activeElement;
        const isEditing = activeEl && this.viewContainerEl?.contains(activeEl) &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
        if (isEditing) {
          return;
        }
        this.renderActiveView();
      }
    });
  }

  applyTheme() {
    const settings = StorageService.getSettings();
    const theme = settings.theme || 'dark';
    const accent = settings.accentColor || 'orange';

    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }

    document.documentElement.setAttribute('data-accent', accent);
  }

  renderSidebar(parent) {
    if (this.sidebarEl) {
      this.sidebarEl.remove();
    }
    this.sidebarEl = createSidebar({
      activeRoute: this.currentRoute,
      onNavigate: (route) => {
        this.router.navigate(route);
      }
    });
    parent.prepend(this.sidebarEl);
  }

  updateBadges() {
    if (!this.sidebarEl) return;
    const data = StorageService.getData();
    const pendingTasks = (data.tasks || []).filter(t => !t.completed).length;
    const today = getTodayDateString();
    const pendingHabits = (data.habits || []).filter(h => !(h.completedDates || []).includes(today)).length;

    // Tarefas pendentes
    const taskBadge = this.sidebarEl.querySelector('#badge-tasks');
    const taskNav = this.sidebarEl.querySelector('#nav-tasks');
    if (taskBadge) {
      if (pendingTasks > 0) {
        taskBadge.textContent = pendingTasks;
      } else {
        taskBadge.remove();
      }
    } else if (pendingTasks > 0 && taskNav) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.id = 'badge-tasks';
      badge.textContent = pendingTasks;
      taskNav.appendChild(badge);
    }

    // Hábitos pendentes hoje
    const habitBadge = this.sidebarEl.querySelector('#badge-habits');
    const habitNav = this.sidebarEl.querySelector('#nav-habits');
    if (habitBadge) {
      if (pendingHabits > 0) {
        habitBadge.textContent = pendingHabits;
      } else {
        habitBadge.remove();
      }
    } else if (pendingHabits > 0 && habitNav) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.id = 'badge-habits';
      badge.textContent = pendingHabits;
      habitNav.appendChild(badge);
    }
  }

  handleRouteChange(route) {
    this.currentRoute = route;

    // Atualiza classes ativas na sidebar
    this.sidebarEl.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-route') === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualiza cabeçalho
    if (this.headerEl) {
      const newHeader = createHeader(route, (r) => this.router.navigate(r));
      this.headerEl.replaceWith(newHeader);
      this.headerEl = newHeader;
    }

    // Renderiza a view correspondente
    this.renderActiveView();
  }

  renderActiveView() {
    if (!this.viewContainerEl) return;

    switch (this.currentRoute) {
      case 'dashboard':
        renderDashboard(this.viewContainerEl, {
          onNavigate: (route) => this.router.navigate(route)
        });
        break;
      case 'krux':
      case 'kore':
        renderKrux(this.viewContainerEl);
        break;
      case 'tasks':
        renderTasks(this.viewContainerEl);
        break;
      case 'agenda':
        renderAgenda(this.viewContainerEl);
        break;
      case 'finances':
        renderFinances(this.viewContainerEl);
        break;
      case 'challenges':
        renderChallenges(this.viewContainerEl);
        break;
      case 'habits':
        renderHabits(this.viewContainerEl);
        break;
      case 'workouts':
        renderWorkouts(this.viewContainerEl);
        break;
      case 'content':
        renderContent(this.viewContainerEl);
        break;
      case 'notes':
        renderNotes(this.viewContainerEl);
        break;
      case 'reading':
        renderReading(this.viewContainerEl);
        break;
      case 'diary':
        renderDiary(this.viewContainerEl);
        break;
      case 'profile':
        renderProfile(this.viewContainerEl);
        break;
      default:
        renderDashboard(this.viewContainerEl, {
          onNavigate: (route) => this.router.navigate(route)
        });
        break;
    }
  }

  /**
   * Configuração de atalhos de teclado
   * ⌘ + N (ou Ctrl + N): Focar na criação de tarefa quando estiver na página de tarefas
   * Esc: Fechar modal aberto ou desfocar campos
   * Não interfere na digitação em andamento
   */
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // 1. Atalho ⌘ + N / Ctrl + N
      if (isCmdOrCtrl && (e.key === 'n' || e.key === 'N')) {
        // Se houver modal aberto, não interfere
        if (document.getElementById('app-modal-overlay')) {
          return;
        }

        // Se estiver na página de tarefas
        if (this.currentRoute === 'tasks') {
          e.preventDefault();
          const taskInput = document.getElementById('input-task-title');
          if (taskInput) {
            if (document.activeElement !== taskInput) {
              taskInput.focus();
              const valLen = taskInput.value.length;
              taskInput.setSelectionRange(valLen, valLen);
            }
          }
        }
      }

      // 2. Atalho Esc (caso não capturado pelo modal)
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('input-task-search');
        if (document.activeElement === searchInput) {
          searchInput.blur();
        }
      }
    });
  }
}

