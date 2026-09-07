/**
 * Módulo de Agenda - Nodus
 * Visualização Mensal de Calendário e Lista Geral de Eventos
 * Integração completa com StorageService, criação, edição e exclusão de eventos
 */
import { StorageService } from '../services/storageService.js';
import { generateId } from '../utils/idGenerator.js';
import { formatDateBR, getTodayDateString, formatRelativeDate } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';
import { openModal } from '../components/modal.js';

// Estado em memória preservado entre navegações na sessão
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0 a 11
let selectedDate = getTodayDateString();
let activeViewMode = 'calendar'; // 'calendar' | 'list'

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Constrói a matriz de células do mês (incluindo preenchimentos do mês anterior e seguinte)
 */
function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Domingo, 1 = Segunda...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // Dias do mês anterior
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    cells.push({
      day: dayNum,
      dateStr,
      isCurrentMonth: false,
      year: prevYear,
      month: prevMonth
    });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      year,
      month
    });
  }

  // Dias do mês seguinte para completar as semanas
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      year: nextYear,
      month: nextMonth
    });
  }

  return cells;
}

export function renderAgenda(container) {
  container.innerHTML = '';

  const data = StorageService.getData();
  const events = data.events || [];
  const todayStr = getTodayDateString();

  // Indexa eventos por data (YYYY-MM-DD)
  const eventsByDate = {};
  events.forEach(e => {
    const key = e.date || 'Sem data';
    if (!eventsByDate[key]) {
      eventsByDate[key] = [];
    }
    eventsByDate[key].push(e);
  });

  // Ordena eventos dentro de cada dia por horário
  Object.values(eventsByDate).forEach(list => {
    list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  // Eventos do dia selecionado
  const selectedDayEvents = eventsByDate[selectedDate] || [];

  // Ordena todos os eventos para a visualização de lista geral
  const sortedEvents = [...events].sort((a, b) => {
    const dateTimeA = `${a.date || ''} ${a.time || ''}`;
    const dateTimeB = `${b.date || ''} ${b.time || ''}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  const agendaEl = document.createElement('div');
  agendaEl.className = 'agenda-view';
  agendaEl.id = 'view-agenda';

  const matrix = getMonthMatrix(calendarYear, calendarMonth);
  const currentMonthName = monthNames[calendarMonth];
  const selectedDateFormatted = formatDateBR(selectedDate);
  const selectedDateRelative = formatRelativeDate(selectedDate);

  agendaEl.innerHTML = `
    <!-- Barra Superior de Controle e Abas da Agenda -->
    <div class="agenda-view-toolbar">
      <!-- Seletor de Modo de Visualização (Pills Nodus) -->
      <div class="finance-pills-selector" style="margin-bottom: 0;">
        <button 
          type="button" 
          class="fin-pill-btn ${activeViewMode === 'calendar' ? 'active' : ''}" 
          id="btn-tab-calendar"
        >
          ${getIcon('calendar')} Calendário
        </button>
        <button 
          type="button" 
          class="fin-pill-btn ${activeViewMode === 'list' ? 'active' : ''}" 
          id="btn-tab-list"
        >
          ${getIcon('list')} Todos os Eventos (${events.length})
        </button>
      </div>

      ${activeViewMode === 'calendar' ? `
        <!-- Navegação do Mês -->
        <div class="calendar-nav-group">
          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            id="btn-prev-month" 
            title="Mês anterior"
          >
            ${getIcon('chevronLeft')}
          </button>
          <div class="calendar-month-title" id="calendar-month-title">
            ${currentMonthName} ${calendarYear}
          </div>
          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            id="btn-next-month" 
            title="Próximo mês"
          >
            ${getIcon('chevronRight')}
          </button>
          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            id="btn-today-month" 
            title="Ir para o mês e dia atual"
          >
            Hoje
          </button>
        </div>
      ` : ''}

      <!-- Botão Novo Evento -->
      <button type="button" class="btn btn-primary btn-sm" id="btn-open-new-event-modal">
        ${getIcon('plus')} Novo Evento
      </button>
    </div>

    <!-- CONTEÚDO: MODO CALENDÁRIO -->
    ${activeViewMode === 'calendar' ? `
      <div class="agenda-main-layout">
        <!-- Grade do Mês -->
        <div class="calendar-card">
          <!-- Cabeçalho dos Dias da Semana -->
          <div class="calendar-weekdays-grid">
            ${weekDayLabels.map(label => `
              <div class="calendar-weekday-col">${label}</div>
            `).join('')}
          </div>

          <!-- Matriz de Células dos Dias -->
          <div class="calendar-days-matrix">
            ${matrix.map(cell => {
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const dayEvs = eventsByDate[cell.dateStr] || [];
              const maxDisplay = 2;
              const displayedEvents = dayEvs.slice(0, maxDisplay);
              const extraCount = dayEvs.length - maxDisplay;

              return `
                <div 
                  class="cal-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" 
                  data-date="${cell.dateStr}"
                  data-year="${cell.year}"
                  data-month="${cell.month}"
                  title="Clique para selecionar ${formatDateBR(cell.dateStr)}"
                >
                  <div class="cal-day-header">
                    <span class="cal-day-number">${cell.day}</span>
                  </div>

                  <div class="cal-events-stack">
                    ${displayedEvents.map(ev => `
                      <div 
                        class="cal-event-pill" 
                        data-event-id="${ev.id}" 
                        title="${ev.time ? ev.time + ' - ' : ''}${escapeHtml(ev.title)} (Clique para editar)"
                      >
                        ${ev.time ? `<span class="cal-pill-time">${ev.time}</span>` : ''}
                        <span class="cal-pill-title">${escapeHtml(ev.title)}</span>
                      </div>
                    `).join('')}

                    ${extraCount > 0 ? `
                      <span class="cal-more-events-tag">+${extraCount} mais</span>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Painel Lateral de Detalhes do Dia Selecionado -->
        <div class="agenda-day-panel">
          <div class="agenda-day-panel-header">
            <div>
              <div class="agenda-day-panel-title">
                ${selectedDateRelative !== selectedDateFormatted ? `${selectedDateRelative} • ` : ''}${selectedDateFormatted}
              </div>
              <div class="agenda-day-panel-sub">
                ${selectedDayEvents.length === 0 ? 'Nenhum compromisso agendado' : `${selectedDayEvents.length} compromisso(s)`}
              </div>
            </div>
            <button 
              type="button" 
              class="btn btn-secondary btn-sm" 
              id="btn-panel-add-event" 
              title="Adicionar evento neste dia"
            >
              ${getIcon('plus')} Adicionar
            </button>
          </div>

          <!-- Formulário Rápido Inline para o Dia Selecionado -->
          <form class="agenda-quick-add-form" id="form-quick-add-day">
            <input 
              type="text" 
              id="input-quick-title" 
              placeholder="Novo compromisso neste dia..." 
              required 
              autocomplete="off" 
            />
            <div style="display: flex; gap: 6px;">
              <input 
                type="time" 
                id="input-quick-time" 
                value="09:00" 
                required 
                style="flex: 1;"
              />
              <button type="submit" class="btn btn-primary btn-sm" style="flex-shrink: 0;">
                Salvar
              </button>
            </div>
          </form>

          <!-- Lista de Eventos do Dia -->
          <div class="agenda-day-events-list">
            ${selectedDayEvents.length === 0 ? `
              <div class="empty-state-box" style="padding: 24px 12px;">
                <div class="empty-state-icon" style="margin-bottom: 8px;">
                  ${getIcon('calendar')}
                </div>
                <h4 class="empty-state-title" style="font-size: 13px;">Dia Livre</h4>
                <p class="empty-state-desc" style="font-size: 11.5px;">Nenhum evento para esta data. Use o campo acima para agendar.</p>
              </div>
            ` : `
              ${selectedDayEvents.map(ev => `
                <div class="cal-panel-event-item" data-id="${ev.id}">
                  <div class="event-details" style="gap: 8px;">
                    <span class="event-time-badge">${ev.time || 'Dia'}</span>
                    <div class="event-text-col">
                      <div class="event-title" style="font-size: 12.5px;">${escapeHtml(ev.title)}</div>
                    </div>
                  </div>

                  <div class="event-actions">
                    <button 
                      type="button" 
                      class="btn-icon-subtle event-edit-btn" 
                      data-id="${ev.id}" 
                      title="Editar evento"
                    >
                      ${getIcon('edit')}
                    </button>
                    <button 
                      type="button" 
                      class="btn-danger-subtle event-delete-btn" 
                      data-id="${ev.id}" 
                      title="Excluir evento"
                    >
                      ${getIcon('trash')}
                    </button>
                  </div>
                </div>
              `).join('')}
            `}
          </div>
        </div>
      </div>
    ` : `
      <!-- CONTEÚDO: MODO LISTA GERAL -->
      <!-- Formulário Tradicional de Agendamento -->
      <form class="form-row-multi" id="form-new-event">
        <input
          type="text"
          id="input-event-title"
          placeholder="Título do compromisso ou evento..."
          autocomplete="off"
          required
        />
        <input
          type="date"
          id="input-event-date"
          value="${selectedDate || todayStr}"
          required
        />
        <input
          type="time"
          id="input-event-time"
          value="09:00"
          required
        />
        <button type="submit" class="btn btn-primary" id="btn-add-event">
          ${getIcon('plus')} Agendar
        </button>
      </form>

      <!-- Lista Agrupada por Data -->
      ${sortedEvents.length === 0 ? `
        <div class="empty-state-box">
          <div class="empty-state-icon">
            ${getIcon('calendar')}
          </div>
          <h4 class="empty-state-title">Nenhum evento agendado</h4>
          <p class="empty-state-desc">Organize seus compromissos, reuniões e lembretes cadastrando seu primeiro evento acima.</p>
        </div>
      ` : `
        <div class="agenda-groups-container">
          ${Object.keys(eventsByDate).sort().map(dateKey => {
            const isToday = dateKey === todayStr;
            const groupList = eventsByDate[dateKey];
            const relativeLabel = formatRelativeDate(dateKey);

            return `
              <div class="agenda-date-group" style="margin-bottom: 20px;">
                <div class="agenda-date-group-title ${isToday ? 'is-today-title' : ''}" style="${isToday ? 'color: var(--accent);' : ''}">
                  ${relativeLabel} ${relativeLabel !== formatDateBR(dateKey) ? `• ${formatDateBR(dateKey)}` : ''}
                </div>

                <div class="item-list">
                  ${groupList.map(e => `
                    <div class="event-item ${isToday ? 'is-today' : ''}" data-id="${e.id}" id="event-item-${e.id}">
                      <div class="event-details">
                        <span class="event-time-badge">${e.time || 'Dia'}</span>
                        <div class="event-text-col">
                          <div class="event-title">${escapeHtml(e.title)}</div>
                          <div class="event-meta-sub">
                            <span class="${isToday ? 'event-today-tag' : ''}">
                              ${isToday ? 'Compromisso de Hoje' : formatDateBR(e.date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div class="event-actions">
                        <button 
                          type="button" 
                          class="btn-icon-subtle event-edit-btn" 
                          data-id="${e.id}" 
                          title="Editar evento"
                        >
                          ${getIcon('edit')}
                        </button>
                        <button 
                          type="button" 
                          class="btn-danger-subtle event-delete-btn" 
                          data-id="${e.id}" 
                          title="Excluir evento"
                        >
                          ${getIcon('trash')}
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `}
  `;

  container.appendChild(agendaEl);

  // --- REGISTRO DE EVENTOS E INTERAÇÕES ---

  // 1. Alternância de abas (Calendário / Lista)
  const tabCalendarBtn = agendaEl.querySelector('#btn-tab-calendar');
  const tabListBtn = agendaEl.querySelector('#btn-tab-list');

  tabCalendarBtn?.addEventListener('click', () => {
    activeViewMode = 'calendar';
    renderAgenda(container);
  });

  tabListBtn?.addEventListener('click', () => {
    activeViewMode = 'list';
    renderAgenda(container);
  });

  // 2. Navegação de Mês no Calendário
  const prevMonthBtn = agendaEl.querySelector('#btn-prev-month');
  prevMonthBtn?.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    renderAgenda(container);
  });

  const nextMonthBtn = agendaEl.querySelector('#btn-next-month');
  nextMonthBtn?.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderAgenda(container);
  });

  const todayMonthBtn = agendaEl.querySelector('#btn-today-month');
  todayMonthBtn?.addEventListener('click', () => {
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    selectedDate = todayStr;
    renderAgenda(container);
  });

  // 3. Clique nas Células de Dia da Grade
  agendaEl.querySelectorAll('.cal-day-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      // Se clicou na pílula do evento, o handler da pílula já trata a edição
      if (e.target.closest('.cal-event-pill')) return;

      const dateStr = cell.getAttribute('data-date');
      const cellYear = parseInt(cell.getAttribute('data-year'), 10);
      const cellMonth = parseInt(cell.getAttribute('data-month'), 10);

      if (dateStr) {
        selectedDate = dateStr;
        if (cellYear && !isNaN(cellMonth) && (cellYear !== calendarYear || cellMonth !== calendarMonth)) {
          calendarYear = cellYear;
          calendarMonth = cellMonth;
        }
        renderAgenda(container);
      }
    });
  });

  // 4. Clique diretamente na pílula de evento no calendário para editar
  agendaEl.querySelectorAll('.cal-event-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = pill.getAttribute('data-event-id');
      if (id) {
        openEditEventModal(container, id);
      }
    });
  });

  // 5. Botões de Abrir Modal de Criação de Evento
  const openNewEventBtn = agendaEl.querySelector('#btn-open-new-event-modal');
  openNewEventBtn?.addEventListener('click', () => {
    openCreateEventModal(container, selectedDate);
  });

  const panelAddEventBtn = agendaEl.querySelector('#btn-panel-add-event');
  panelAddEventBtn?.addEventListener('click', () => {
    openCreateEventModal(container, selectedDate);
  });

  // 6. Formulário Rápido Inline do Painel Lateral (Dia Selecionado)
  const quickForm = agendaEl.querySelector('#form-quick-add-day');
  quickForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = quickForm.querySelector('#input-quick-title');
    const timeInput = quickForm.querySelector('#input-quick-time');

    const title = titleInput ? titleInput.value.trim() : '';
    const time = timeInput ? timeInput.value : '09:00';

    if (!title) return;

    const newEvent = {
      id: generateId('event'),
      title,
      date: selectedDate,
      time,
      createdAt: new Date().toISOString()
    };

    const currentEvents = StorageService.getData().events || [];
    await StorageService.updateSection('events', [...currentEvents, newEvent]);
    renderAgenda(container);
  });

  // 7. Formulário Tradicional de Eventos (na aba de Lista)
  const fullForm = agendaEl.querySelector('#form-new-event');
  fullForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = fullForm.querySelector('#input-event-title');
    const dateInput = fullForm.querySelector('#input-event-date');
    const timeInput = fullForm.querySelector('#input-event-time');

    const title = titleInput ? titleInput.value.trim() : '';
    const date = dateInput ? dateInput.value : '';
    const time = timeInput ? timeInput.value : '09:00';

    if (!title || !date) return;

    const newEvent = {
      id: generateId('event'),
      title,
      date,
      time,
      createdAt: new Date().toISOString()
    };

    const currentEvents = StorageService.getData().events || [];
    await StorageService.updateSection('events', [...currentEvents, newEvent]);
    selectedDate = date;

    const [y, m] = date.split('-').map(Number);
    if (y && m) {
      calendarYear = y;
      calendarMonth = m - 1;
    }

    renderAgenda(container);
  });

  // 8. Edição de Evento em Modais
  agendaEl.querySelectorAll('.event-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (id) {
        openEditEventModal(container, id);
      }
    });
  });

  // 9. Exclusão de Evento
  agendaEl.querySelectorAll('.event-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (!id) return;
      const currentEvents = StorageService.getData().events || [];
      const updated = currentEvents.filter(ev => ev.id !== id);
      await StorageService.updateSection('events', updated);
      renderAgenda(container);
    });
  });
}

/**
 * Abre modal padronizado para criar um novo evento
 */
function openCreateEventModal(container, prefilledDate) {
  const todayStr = getTodayDateString();
  const dateValue = prefilledDate || selectedDate || todayStr;

  openModal({
    title: 'Novo Compromisso',
    contentHtml: `
      <div class="modal-field">
        <label class="modal-label" for="create-event-input-title">Título do Evento</label>
        <input 
          type="text" 
          id="create-event-input-title" 
          placeholder="Ex: Reunião de equipe, Consulta médica..." 
          autocomplete="off"
        />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="modal-field">
          <label class="modal-label" for="create-event-input-date">Data</label>
          <input 
            type="date" 
            id="create-event-input-date" 
            value="${escapeHtml(dateValue)}" 
          />
        </div>
        <div class="modal-field">
          <label class="modal-label" for="create-event-input-time">Horário</label>
          <input 
            type="time" 
            id="create-event-input-time" 
            value="09:00" 
          />
        </div>
      </div>
    `,
    confirmText: 'Agendar',
    onConfirm: async ({ dialog, setError }) => {
      const titleInput = dialog.querySelector('#create-event-input-title');
      const dateInput = dialog.querySelector('#create-event-input-date');
      const timeInput = dialog.querySelector('#create-event-input-time');

      const title = titleInput ? titleInput.value.trim() : '';
      const date = dateInput ? dateInput.value : '';
      const time = timeInput ? timeInput.value : '09:00';

      if (!title) {
        setError('O título do evento é obrigatório.');
        return false;
      }
      if (!date) {
        setError('Selecione uma data válida.');
        return false;
      }

      const newEvent = {
        id: generateId('event'),
        title,
        date,
        time,
        createdAt: new Date().toISOString()
      };

      const currentEvents = StorageService.getData().events || [];
      await StorageService.updateSection('events', [...currentEvents, newEvent]);

      selectedDate = date;
      const [y, m] = date.split('-').map(Number);
      if (y && m) {
        calendarYear = y;
        calendarMonth = m - 1;
      }

      renderAgenda(container);
      return true;
    }
  });
}

/**
 * Abre modal padronizado para editar um evento existente
 */
function openEditEventModal(container, eventId) {
  const currentEvents = StorageService.getData().events || [];
  const event = currentEvents.find(e => e.id === eventId);
  if (!event) return;

  const todayStr = getTodayDateString();

  openModal({
    title: 'Editar Evento',
    contentHtml: `
      <div class="modal-field">
        <label class="modal-label" for="edit-event-input-title">Título do Evento</label>
        <input 
          type="text" 
          id="edit-event-input-title" 
          value="${escapeHtml(event.title)}" 
          placeholder="Digite o título do evento..."
          autocomplete="off"
        />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="modal-field">
          <label class="modal-label" for="edit-event-input-date">Data</label>
          <input 
            type="date" 
            id="edit-event-input-date" 
            value="${escapeHtml(event.date || todayStr)}" 
          />
        </div>
        <div class="modal-field">
          <label class="modal-label" for="edit-event-input-time">Horário</label>
          <input 
            type="time" 
            id="edit-event-input-time" 
            value="${escapeHtml(event.time || '09:00')}" 
          />
        </div>
      </div>
    `,
    confirmText: 'Salvar Alterações',
    onConfirm: async ({ dialog, setError }) => {
      const newTitleInput = dialog.querySelector('#edit-event-input-title');
      const newDateInput = dialog.querySelector('#edit-event-input-date');
      const newTimeInput = dialog.querySelector('#edit-event-input-time');

      const newTitle = newTitleInput ? newTitleInput.value.trim() : '';
      const newDate = newDateInput ? newDateInput.value : '';
      const newTime = newTimeInput ? newTimeInput.value : '';

      if (!newTitle) {
        setError('O título do evento não pode ficar vazio.');
        return false;
      }
      if (!newDate) {
        setError('Selecione uma data válida.');
        return false;
      }

      const updated = currentEvents.map(e => {
        if (e.id === eventId) {
          return { ...e, title: newTitle, date: newDate, time: newTime };
        }
        return e;
      });

      await StorageService.updateSection('events', updated);
      selectedDate = newDate;

      renderAgenda(container);
      return true;
    }
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
