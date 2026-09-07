/**
 * Módulo Dashboard (Home) — Nodus
 * Layout estético inspirado em macOS Desktop:
 * - Saudação dinâmica com data e status
 * - Score calculado com base nos dias cumpridos no desafio ativo
 * - Plano do Dia integrado com Diário e Tarefas em tempo real
 * - Colunas balanceadas para Tarefas, Finanças, Hábitos, Desafio e Agenda
 */
import { StorageService } from '../services/storageService.js';
import { getGreeting, formatDateBR, getTodayDateString, formatRelativeDate, calculateStreak } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';
import { normalizePriority, PRIORITY_LEVELS } from '../utils/priority.js';
import { showToast } from '../components/toast.js';

export function renderDashboard(container, { onNavigate }) {
  container.innerHTML = '';

  const data = StorageService.getData();
  const settings = StorageService.getSettings();
  const userName = settings.user?.name ? settings.user.name.split(' ')[0] : '';
  const dailyPlan = StorageService.getDailyPlan();
  const rawTasks = data.tasks || [];
  const habits = data.habits || [];
  const events = data.events || [];
  const finances = data.finances?.transactions || [];
  
  // Desafio Ativo & Cálculo do Score (Dias cumpridos no desafio)
  const challenges = data.challenges || [];
  const activeChallenge = challenges.find(c => c.active) || challenges[0] || {
    id: 'nodus-21',
    title: 'Desafio Nodus 21',
    daysTotal: 21,
    checkins: []
  };

  const todayStr = getTodayDateString();
  const challengeCheckins = activeChallenge.checkins || [];
  const challengeDaysDone = challengeCheckins.length;
  const challengeTotalDays = parseInt(activeChallenge.daysTotal) || 21;
  const challengeProgress = Math.min(100, Math.round((challengeDaysDone / challengeTotalDays) * 100));
  const challengeDaysRemaining = Math.max(0, challengeTotalDays - challengeDaysDone);
  const hasCheckedInToday = challengeCheckins.includes(todayStr);

  // Sincronização Diário do dia de hoje
  const todayDiary = (data.diary || []).find(d => d.date === todayStr);
  const expectedOfDay = todayDiary?.expected || dailyPlan?.expectedOfDay || '';
  const gratitude = todayDiary?.grateful || dailyPlan?.gratitude || '';

  const tasks = rawTasks.map(t => ({
    ...t,
    priority: normalizePriority(t.priority)
  }));

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const highPriorityPending = pendingTasks.filter(t => t.priority === PRIORITY_LEVELS.ALTA);

  // Tarefa Principal do Dia (Sincronizada com Tarefas)
  const mainTask = tasks.find(t => t.isMain) || 
                   tasks.find(t => t.title === dailyPlan?.mainTask) || 
                   highPriorityPending[0] || 
                   tasks[0];
  
  const habitsCompletedToday = habits.filter(h => (h.completedDates || []).includes(todayStr));
  const totalHabits = habits.length;

  // Finanças
  let totalIncome = 0;
  let totalExpense = 0;
  finances.forEach(t => {
    const val = parseFloat(t.amount) || 0;
    if (t.type === 'income') totalIncome += val;
    else totalExpense += val;
  });
  const balance = totalIncome - totalExpense;

  // Próximos eventos
  const sortedEvents = [...events].sort((a, b) => {
    const dateTimeA = `${a.date || ''} ${a.time || ''}`;
    const dateTimeB = `${b.date || ''} ${b.time || ''}`;
    return dateTimeA.localeCompare(dateTimeB);
  }).slice(0, 3);

  const dashboardEl = document.createElement('div');
  dashboardEl.className = 'dashboard-view';
  dashboardEl.id = 'view-dashboard';

  // Formatador estético de data em português
  const now = new Date();
  const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const weekDayName = weekDays[now.getDay()];
  const formattedFullDate = `${weekDayName}, ${now.getDate()} de ${months[now.getMonth()]}`;

  dashboardEl.innerHTML = `
    <!-- Top Hero Row (Saudação + Score de Consistência do Desafio) -->
    <div class="dash-top-hero-row">
      <div class="dash-hero-text">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <h2 class="dash-greeting-title">${getGreeting()}${userName ? `, ${userName}` : ''}</h2>
          <span style="font-size: 20px;">👋</span>
        </div>
        <p class="dash-greeting-sub">
          <span class="dash-date-text">${formattedFullDate}</span> • 
          ${pendingTasks.length > 0 ? `<span style="color: var(--text-primary); font-weight: 500;">${pendingTasks.length} tarefas pendentes</span>` : `<span style="color: var(--success); font-weight: 500;">Todas as tarefas concluídas!</span>`}
        </p>
      </div>

      <div class="dash-hero-badges">
        <!-- Score: Quantidade de dias cumpridos no desafio ativo -->
        <div class="dash-score-pill" id="dash-score-badge" title="Clique para ver o Desafio: ${challengeDaysDone} de ${challengeTotalDays} dias cumpridos" style="cursor: pointer;">
          <span class="score-icon">🔥</span>
          <div style="display: flex; flex-direction: column; line-height: 1.15; text-align: left;">
            <span class="score-label" style="font-size: 10px; opacity: 0.85; font-weight: 600; letter-spacing: 0.05em;">SCORE DESAFIO</span>
            <span class="score-val" style="font-size: 15px; font-weight: 700;">${challengeDaysDone} <span style="font-size: 11px; font-weight: 500; opacity: 0.85;">/ ${challengeTotalDays} dias</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. Card: Plano do Dia (Inputs sincronizados em tempo real) -->
    <div class="card dash-daily-plan-card">
      <div class="plan-card-header">
        <div class="plan-title-box">
          <span class="plan-icon">🌅</span>
          <div>
            <h3>Plano do Dia</h3>
            <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Sincronizado automaticamente com seu Diário e lista de Tarefas</p>
          </div>
        </div>
        <span class="plan-save-indicator" id="plan-save-indicator">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--success); margin-right: 4px;"></span>Sincronizado
        </span>
      </div>

      <div class="daily-plan-grid">
        <div class="plan-input-group">
          <label for="plan-expected">
            <span>🎯 O que você espera de hoje? (Diário)</span>
          </label>
          <input 
            type="text" 
            id="plan-expected" 
            class="plan-inline-input"
            value="${escapeHtml(expectedOfDay)}" 
            placeholder="Ex: Executar prioridades com foco e tranquilidade..."
          />
        </div>

        <div class="plan-input-group">
          <label for="plan-main-task" style="display: flex; align-items: center; justify-content: space-between;">
            <span>⭐ Principal tarefa executiva (Tarefas)</span>
            ${mainTask?.priority ? `<span class="priority-badge priority-${mainTask.priority}" style="font-size: 10px;">${mainTask.priority.toUpperCase()}</span>` : ''}
          </label>
          <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
            <div 
              class="task-checkbox ${mainTask?.completed ? 'checked' : ''}" 
              id="dash-main-task-check" 
              title="${mainTask?.completed ? 'Reabrir tarefa' : 'Concluir principal tarefa'}" 
              style="cursor: pointer; flex-shrink: 0;"
            >
              ${mainTask?.completed ? getIcon('check') : ''}
            </div>
            <input 
              type="text" 
              id="plan-main-task" 
              class="plan-inline-input highlight-task"
              value="${escapeHtml(mainTask?.title || dailyPlan?.mainTask || '')}" 
              placeholder="Ex: Finalizar entrega prioritária do projeto..."
              style="flex: 1; ${mainTask?.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}"
            />
          </div>
        </div>

        <div class="plan-input-group">
          <label for="plan-gratitude">
            <span>💎 Pelo que você é grato hoje? (Diário)</span>
          </label>
          <input 
            type="text" 
            id="plan-gratitude" 
            class="plan-inline-input"
            value="${escapeHtml(gratitude)}" 
            placeholder="Ex: Pela clareza, dedicação e saúde..."
          />
        </div>
      </div>
    </div>

    <!-- Grade de 2 Colunas com Layout Balanceado -->
    <div class="dash-content-grid">
      
      <!-- Coluna 1: Tarefas Prioritárias & Finanças Rápidas -->
      <div class="dash-column">
        <!-- Tarefas Prioritárias -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span style="color: var(--accent);">${getIcon('tasks')}</span>
              <span>Tarefas Prioritárias</span>
            </h3>
            <button class="card-action-link" id="dash-link-tasks">
              Ver todas ${getIcon('arrowRight')}
            </button>
          </div>

          ${pendingTasks.length === 0 ? `
            <div class="empty-state-box" style="padding: 24px 16px;">
              <div class="empty-state-icon" style="color: var(--success);">${getIcon('checkCircle')}</div>
              <h4 class="empty-state-title" style="font-size: 13.5px;">Tudo em dia por aqui!</h4>
              <p class="empty-state-desc" style="font-size: 12px;">Nenhuma tarefa pendente para hoje.</p>
              <button class="btn btn-secondary btn-sm empty-state-btn" id="dash-btn-new-task">
                ${getIcon('plus')} Criar Tarefa
              </button>
            </div>
          ` : `
            <div class="item-list" id="dash-tasks-list">
              ${pendingTasks.slice(0, 5).map(t => {
                const isHigh = t.priority === PRIORITY_LEVELS.ALTA;
                return `
                  <div class="task-item ${isHigh ? 'task-highlight-high' : ''}" data-id="${t.id}" style="padding: 10px 12px;">
                    <div class="task-left">
                      <div class="task-checkbox dash-task-toggle" data-id="${t.id}" title="Marcar como concluída">
                      </div>
                      <div class="task-title-and-badges">
                        <span class="task-title">${escapeHtml(t.title)}</span>
                        ${isHigh ? `
                          <span class="priority-badge priority-alta" title="Prioridade Alta">Alta</span>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Finanças Rápidas -->
        <div class="card dash-finance-widget">
          <div class="card-header">
            <h3 class="card-title">
              <span style="color: var(--accent);">${getIcon('finances')}</span>
              <span>Resumo Financeiro</span>
            </h3>
            <button class="card-action-link" id="dash-link-finances">
              Detalhes ${getIcon('arrowRight')}
            </button>
          </div>

          <div class="dash-finance-summary-row">
            <div class="dash-fin-item">
              <span class="fin-sublabel">Saldo Líquido</span>
              <span class="fin-val ${balance >= 0 ? 'positive' : 'negative'}">
                R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div class="dash-fin-item">
              <span class="fin-sublabel">Receitas</span>
              <span class="fin-val positive">+ R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="dash-fin-item">
              <span class="fin-sublabel">Despesas</span>
              <span class="fin-val negative">- R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Coluna 2: Hábitos de Hoje, Desafio & Agenda -->
      <div class="dash-column">
        
        <!-- Hábitos de Hoje -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span style="color: var(--accent);">${getIcon('habits')}</span>
              <span>Hábitos de Hoje (${habitsCompletedToday.length}/${totalHabits})</span>
            </h3>
            <button class="card-action-link" id="dash-link-habits">
              Ver todos ${getIcon('arrowRight')}
            </button>
          </div>

          ${habits.length === 0 ? `
            <div class="empty-state-box" style="padding: 24px 16px;">
              <div class="empty-state-icon">${getIcon('habits')}</div>
              <h4 class="empty-state-title" style="font-size: 13.5px;">Nenhum hábito ativo</h4>
              <button class="btn btn-secondary btn-sm empty-state-btn" id="dash-btn-new-habit">
                ${getIcon('plus')} Criar Hábito
              </button>
            </div>
          ` : `
            <div class="item-list" id="dash-habits-list">
              ${habits.map(h => {
                const isDoneToday = (h.completedDates || []).includes(todayStr);
                const streak = calculateStreak(h.completedDates || []);

                return `
                  <div class="habit-item ${isDoneToday ? 'completed' : ''}" data-id="${h.id}" style="padding: 9px 12px;">
                    <div class="habit-left" style="display: flex; flex-direction: row; align-items: center; gap: 10px;">
                      <button 
                        type="button" 
                        class="habit-check-btn ${isDoneToday ? 'checked' : ''} dash-habit-toggle" 
                        data-id="${h.id}"
                        title="${isDoneToday ? 'Desmarcar hábito' : 'Concluir hábito hoje'}"
                      >
                        ${isDoneToday ? getIcon('check') : ''}
                      </button>
                      <span class="habit-title" style="${isDoneToday ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${escapeHtml(h.title)}</span>
                    </div>
                    <div class="streak-badge" title="Sequência consecutiva">
                      ${getIcon('flame')} ${streak}d
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Desafio Ativo Widget (Score & Check-in Direto) -->
        <div class="card dash-challenge-widget">
          <div class="challenge-widget-top">
            <div class="ch-title-wrap">
              <span class="flame">🔥</span>
              <strong>${escapeHtml(activeChallenge.title || 'Desafio Nodus')}</strong>
            </div>
            <span class="ch-days-pill">${challengeDaysRemaining} dias restantes</span>
          </div>

          <div class="ch-progress-wrap">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${challengeProgress}%;"></div>
            </div>
            <div class="ch-meta-row">
              <span class="text-muted-xs">
                <strong>${challengeDaysDone}</strong> de ${challengeTotalDays} dias cumpridos (${challengeProgress}%)
              </span>
              <button class="btn-checkin-quick ${hasCheckedInToday ? 'done' : ''}" id="dash-quick-checkin">
                ${hasCheckedInToday ? '✓ Check-in Feito' : 'Fazer Check-in'}
              </button>
            </div>
          </div>
        </div>

        <!-- Próximos Eventos -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span style="color: var(--accent);">${getIcon('calendar')}</span>
              <span>Próximos Compromissos</span>
            </h3>
            <button class="card-action-link" id="dash-link-agenda">
              Agenda ${getIcon('arrowRight')}
            </button>
          </div>

          ${sortedEvents.length === 0 ? `
            <div class="empty-state-box" style="padding: 16px 0;">
              <p class="empty-state-desc" style="margin: 0;">Nenhum evento agendado para hoje.</p>
            </div>
          ` : `
            <div class="item-list" id="dash-events-list">
              ${sortedEvents.map(e => {
                const isToday = e.date === todayStr;
                return `
                  <div class="event-item ${isToday ? 'is-today' : ''}" data-id="${e.id}">
                    <div class="event-details">
                      <span class="event-time-badge">${e.time || 'Dia'}</span>
                      <div class="event-text-col">
                        <div class="event-title">${escapeHtml(e.title)}</div>
                        <div class="event-meta-sub">
                          <span class="${isToday ? 'event-today-tag' : ''}">
                            ${formatRelativeDate(e.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>

    </div>
  `;

  container.appendChild(dashboardEl);

  // Clique no Score Pill do Hero -> Abre desafios
  dashboardEl.querySelector('#dash-score-badge')?.addEventListener('click', () => onNavigate?.('challenges'));

  // Sincronização em tempo real do Plano do Dia com Diário e Tarefas
  const planExpected = dashboardEl.querySelector('#plan-expected');
  const planMainTask = dashboardEl.querySelector('#plan-main-task');
  const planGratitude = dashboardEl.querySelector('#plan-gratitude');
  const saveIndicator = dashboardEl.querySelector('#plan-save-indicator');
  const mainTaskCheck = dashboardEl.querySelector('#dash-main-task-check');

  // Toggle Conclusão da Principal Tarefa diretamente na Home
  if (mainTaskCheck && mainTask) {
    mainTaskCheck.addEventListener('click', async () => {
      const currentTasks = StorageService.getData().tasks || [];
      const updated = currentTasks.map(t => {
        if (t.id === mainTask.id) {
          const isDone = !t.completed;
          return { ...t, completed: isDone, completedAt: isDone ? new Date().toISOString() : null };
        }
        return t;
      });
      await StorageService.updateSection('tasks', updated);
      showToast(mainTask.completed ? 'Tarefa reaberta' : 'Principal tarefa concluída!', 'success');
      renderDashboard(container, { onNavigate });
    });
  }

  let debounceTimer;
  const saveDailyPlanLive = () => {
    clearTimeout(debounceTimer);
    if (saveIndicator) {
      saveIndicator.innerHTML = '<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); margin-right: 4px;"></span>Salvando...';
    }
    debounceTimer = setTimeout(async () => {
      const expVal = planExpected.value.trim();
      const gratVal = planGratitude.value.trim();
      const mainVal = planMainTask.value.trim();

      const currentData = StorageService.getData();
      const updatedDailyPlan = {
        expectedOfDay: expVal,
        mainTask: mainVal,
        gratitude: gratVal
      };

      // 1. Sincroniza com Diário de hoje
      const currentDiary = [...(currentData.diary || [])];
      const diaryIdx = currentDiary.findIndex(e => e.date === todayStr);
      if (diaryIdx >= 0) {
        currentDiary[diaryIdx] = {
          ...currentDiary[diaryIdx],
          expected: expVal,
          grateful: gratVal,
          updatedAt: new Date().toISOString()
        };
      } else if (expVal || gratVal) {
        currentDiary.unshift({
          id: `diary-${Date.now()}`,
          date: todayStr,
          expected: expVal,
          grateful: gratVal,
          content: '',
          mood: 'focado',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Sincroniza com Tarefas (se digitou/alterou o nome da principal tarefa)
      let currentTasks = [...(currentData.tasks || [])];
      if (mainVal) {
        const existingMainIdx = currentTasks.findIndex(t => t.id === mainTask?.id || t.isMain);
        if (existingMainIdx >= 0) {
          currentTasks[existingMainIdx] = {
            ...currentTasks[existingMainIdx],
            title: mainVal,
            isMain: true
          };
        } else {
          currentTasks.unshift({
            id: `task-${Date.now()}`,
            title: mainVal,
            completed: false,
            priority: 'alta',
            isMain: true,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Salva de forma unificada para evitar múltiplas chamadas e sinaliza a origem daily-plan
      await StorageService.saveData({
        ...currentData,
        dailyPlan: updatedDailyPlan,
        diary: currentDiary,
        tasks: currentTasks
      }, { source: 'daily-plan' });

      if (saveIndicator) {
        saveIndicator.innerHTML = '<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--success); margin-right: 4px;"></span>Sincronizado';
      }
    }, 450);
  };

  planExpected.addEventListener('input', saveDailyPlanLive);
  planMainTask.addEventListener('input', saveDailyPlanLive);
  planGratitude.addEventListener('input', saveDailyPlanLive);

  // Navegações rápidas
  dashboardEl.querySelector('#dash-link-tasks')?.addEventListener('click', () => onNavigate?.('tasks'));
  dashboardEl.querySelector('#dash-btn-new-task')?.addEventListener('click', () => onNavigate?.('tasks'));
  
  dashboardEl.querySelector('#dash-link-finances')?.addEventListener('click', () => onNavigate?.('finances'));
  dashboardEl.querySelector('#dash-link-habits')?.addEventListener('click', () => onNavigate?.('habits'));
  dashboardEl.querySelector('#dash-btn-new-habit')?.addEventListener('click', () => onNavigate?.('habits'));

  dashboardEl.querySelector('#dash-link-agenda')?.addEventListener('click', () => onNavigate?.('agenda'));

  // Check-in rápido no Desafio Ativo
  const quickCheckinBtn = dashboardEl.querySelector('#dash-quick-checkin');
  if (quickCheckinBtn) {
    quickCheckinBtn.addEventListener('click', async () => {
      const currentData = StorageService.getData();
      const currentChallenges = currentData.challenges || [];
      const targetIdx = currentChallenges.findIndex(c => c.id === activeChallenge.id);
      
      const targetChallenge = targetIdx >= 0 ? currentChallenges[targetIdx] : activeChallenge;
      let newCheckins = [...(targetChallenge.checkins || [])];
      let didCheckIn = false;

      if (newCheckins.includes(todayStr)) {
        newCheckins = newCheckins.filter(d => d !== todayStr);
        didCheckIn = false;
      } else {
        newCheckins.push(todayStr);
        didCheckIn = true;
      }

      const totalDays = parseInt(targetChallenge.daysTotal) || 21;
      const updatedChallenge = {
        ...targetChallenge,
        checkins: newCheckins,
        progress: Math.min(100, Math.round((newCheckins.length / totalDays) * 100)),
        daysRemaining: Math.max(0, totalDays - newCheckins.length)
      };

      let updatedList = [];
      if (targetIdx >= 0) {
        updatedList = [...currentChallenges];
        updatedList[targetIdx] = updatedChallenge;
      } else {
        updatedList = [updatedChallenge, ...currentChallenges];
      }

      await StorageService.updateSection('challenges', updatedList);
      
      // Atualiza o badge do topo da janela se visível
      const headerChallengeText = document.querySelector('#header-challenge-btn .challenge-text');
      if (headerChallengeText) {
        headerChallengeText.textContent = `${updatedChallenge.daysRemaining} dias restantes do ${targetChallenge.title || 'Desafio Escape21'}`;
      }

      showToast(didCheckIn ? `Check-in de hoje registrado! Score: ${newCheckins.length} dias` : 'Check-in desmarcado', didCheckIn ? 'success' : 'info');
      renderDashboard(container, { onNavigate });
    });
  }

  // Alternar conclusão de tarefa diretamente no Dashboard
  dashboardEl.querySelectorAll('.dash-task-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId = btn.getAttribute('data-id');
      const currentTasks = StorageService.getData().tasks || [];
      const updated = currentTasks.map(t => {
        if (t.id === taskId) {
          return { ...t, completed: true, completedAt: new Date().toISOString() };
        }
        return t;
      });
      await StorageService.updateSection('tasks', updated);
      showToast('Tarefa concluída!', 'success');
      renderDashboard(container, { onNavigate });
    });
  });

  // Alternar conclusão de hábito diretamente no Dashboard
  dashboardEl.querySelectorAll('.dash-habit-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.getAttribute('data-id');
      const currentHabits = StorageService.getData().habits || [];
      let isCompleted = false;

      const updated = currentHabits.map(h => {
        if (h.id === habitId) {
          const dates = Array.isArray(h.completedDates) ? [...h.completedDates] : [];
          const idx = dates.indexOf(todayStr);
          if (idx >= 0) {
            dates.splice(idx, 1);
            isCompleted = false;
          } else {
            dates.push(todayStr);
            isCompleted = true;
          }
          return {
            ...h,
            completedDates: dates,
            streak: calculateStreak(dates)
          };
        }
        return h;
      });
      await StorageService.updateSection('habits', updated);
      showToast(isCompleted ? 'Hábito concluído hoje!' : 'Hábito desmarcado', isCompleted ? 'success' : 'info');
      renderDashboard(container, { onNavigate });
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
