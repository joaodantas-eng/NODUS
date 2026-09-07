/**
 * Módulo de Tarefas
 * Criar, listar, buscar, ordenar, alternar conclusão, editar e excluir tarefas
 * Suporte a prioridades (Baixa, Normal, Alta), busca em tempo real, ordenação e atalhos de teclado
 */
import { StorageService } from '../services/storageService.js';
import { generateId } from '../utils/idGenerator.js';
import { formatDateTimeBR } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { 
  normalizePriority, 
  getPriorityLabel, 
  getPriorityWeight, 
  PRIORITY_LEVELS 
} from '../utils/priority.js';

let currentFilter = 'all'; // 'all', 'pending', 'completed'
let currentSearch = '';
let currentSort = 'recent'; // 'recent', 'oldest', 'priority'

export function renderTasks(container) {
  container.innerHTML = '';

  const data = StorageService.getData();
  const allTasks = (data.tasks || []).map(t => ({
    ...t,
    priority: normalizePriority(t.priority)
  }));

  const pendingList = allTasks.filter(t => !t.completed);
  const completedList = allTasks.filter(t => t.completed);

  // 1. Aplica filtro de status
  let filtered = allTasks;
  if (currentFilter === 'pending') filtered = pendingList;
  if (currentFilter === 'completed') filtered = completedList;

  // 2. Aplica busca em tempo real (case-insensitive pelo título)
  const query = currentSearch.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(t => (t.title || '').toLowerCase().includes(query));
  }

  // 3. Aplica ordenação
  filtered = sortTasks(filtered, currentSort);

  const tasksEl = document.createElement('div');
  tasksEl.className = 'tasks-view';
  tasksEl.id = 'view-tasks';

  tasksEl.innerHTML = `
    <!-- Barra de Criação Rápida com Prioridade -->
    <div class="tasks-creator-card">
      <form class="quick-form-advanced" id="form-new-task">
        <div class="task-input-row">
          <input
            type="text"
            id="input-task-title"
            placeholder="O que você precisa fazer? (Pressione Enter para adicionar)"
            autocomplete="off"
            required
          />
          <div class="task-input-controls">
            <div class="priority-select-wrapper" title="Prioridade da tarefa">
              <select id="select-new-priority" class="select-priority-input" aria-label="Prioridade da tarefa">
                <option value="${PRIORITY_LEVELS.BAIXA}">Prioridade Baixa</option>
                <option value="${PRIORITY_LEVELS.NORMAL}" selected>Prioridade Normal</option>
                <option value="${PRIORITY_LEVELS.ALTA}">Prioridade Alta</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-add-task">
              ${getIcon('plus')} Adicionar
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Barra de Ferramentas: Filtros + Busca + Ordenação -->
    <div class="tasks-toolbar">
      <!-- Filtros de Status -->
      <div class="filter-tabs">
        <button class="tab-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" id="tab-filter-all">
          Todas (${allTasks.length})
        </button>
        <button class="tab-btn ${currentFilter === 'pending' ? 'active' : ''}" data-filter="pending" id="tab-filter-pending">
          Pendentes (${pendingList.length})
        </button>
        <button class="tab-btn ${currentFilter === 'completed' ? 'active' : ''}" data-filter="completed" id="tab-filter-completed">
          Concluídas (${completedList.length})
        </button>
      </div>

      <!-- Controles de Busca e Ordenação -->
      <div class="tasks-toolbar-actions">
        <!-- Busca em Tempo Real -->
        <div class="search-box-wrapper">
          <span class="search-icon">${getIcon('search')}</span>
          <input
            type="text"
            class="search-input"
            id="input-task-search"
            placeholder="Buscar por título..."
            value="${escapeHtml(currentSearch)}"
            autocomplete="off"
          />
          ${currentSearch ? `
            <button type="button" class="btn-clear-search" id="btn-clear-search" title="Limpar busca">
              ${getIcon('close')}
            </button>
          ` : ''}
        </div>

        <!-- Ordenação -->
        <div class="sort-select-wrapper" title="Ordenar tarefas">
          <label for="select-task-sort" class="sort-label">Ordenar:</label>
          <select id="select-task-sort" class="select-sort-input" aria-label="Ordenar tarefas">
            <option value="recent" ${currentSort === 'recent' ? 'selected' : ''}>Mais recentes</option>
            <option value="oldest" ${currentSort === 'oldest' ? 'selected' : ''}>Mais antigas</option>
            <option value="priority" ${currentSort === 'priority' ? 'selected' : ''}>Maior prioridade</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista de Tarefas ou Estados Vazios -->
    <div id="tasks-list-container">
      ${renderTaskListHtml(filtered, query, currentFilter, allTasks.length)}
    </div>
  `;

  container.appendChild(tasksEl);

  attachTasksEventListeners(container, tasksEl);
}

/**
 * Renderiza o HTML da lista ou o estado vazio correspondente
 */
function renderTaskListHtml(filteredTasks, query, filter, totalTasksCount) {
  if (filteredTasks.length === 0) {
    if (query) {
      return `
        <div class="empty-state-box" id="empty-state-search">
          <div class="empty-state-icon">
            ${getIcon('search')}
          </div>
          <h4 class="empty-state-title">Nenhuma tarefa encontrada</h4>
          <p class="empty-state-desc">
            Nenhum resultado corresponde à busca "<strong>${escapeHtml(query)}</strong>".
          </p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-clear-search">
            Limpar busca
          </button>
        </div>
      `;
    }

    return `
      <div class="empty-state-box" id="empty-state-filter">
        <div class="empty-state-icon">
          ${getIcon(filter === 'completed' ? 'tasks' : 'checkCircle')}
        </div>
        <h4 class="empty-state-title">
          ${filter === 'pending' ? 'Nenhuma tarefa pendente' : filter === 'completed' ? 'Nenhuma tarefa concluída' : 'Você ainda não tem tarefas'}
        </h4>
        <p class="empty-state-desc">
          ${filter === 'pending' 
            ? 'Excelente! Você finalizou todas as pendências da sua lista.' 
            : filter === 'completed' 
              ? 'Conclua suas primeiras atividades para visualizar o histórico de realizações.' 
              : 'Crie sua primeira tarefa no campo acima para começar a organizar seu dia.'}
        </p>
      </div>
    `;
  }

  return `
    <div class="item-list" id="tasks-list">
      ${filteredTasks.map(t => {
        const priority = normalizePriority(t.priority);
        const priorityLabel = getPriorityLabel(priority);

        return `
          <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}" id="task-item-${t.id}">
            <div class="task-left">
              <button 
                type="button"
                class="task-checkbox ${t.completed ? 'checked' : ''} task-toggle-btn" 
                data-id="${t.id}" 
                title="${t.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}"
              >
                ${t.completed ? getIcon('check') : ''}
              </button>
              <div class="task-title-and-badges">
                <span class="task-title">${escapeHtml(t.title)}</span>
                <span class="priority-badge priority-${priority}" title="Prioridade: ${priorityLabel}">
                  ${priorityLabel}
                </span>
              </div>
            </div>
            
            <div class="task-actions">
              <span class="task-date">${formatDateTimeBR(t.createdAt)}</span>
              <button 
                type="button" 
                class="btn-icon-subtle task-edit-btn" 
                data-id="${t.id}" 
                title="Editar tarefa"
              >
                ${getIcon('edit')}
              </button>
              <button 
                type="button" 
                class="btn-danger-subtle task-delete-btn" 
                data-id="${t.id}" 
                title="Excluir tarefa"
              >
                ${getIcon('trash')}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Conecta todos os manipuladores de evento da tela de tarefas
 */
function attachTasksEventListeners(container, tasksEl) {
  const searchInput = tasksEl.querySelector('#input-task-search');
  const titleInput = tasksEl.querySelector('#input-task-title');
  const form = tasksEl.querySelector('#form-new-task');

  // Submissão de nova tarefa
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) return;

    const prioritySelect = tasksEl.querySelector('#select-new-priority');
    const priority = normalizePriority(prioritySelect ? prioritySelect.value : PRIORITY_LEVELS.NORMAL);

    const newTask = {
      id: generateId('task'),
      title: title,
      completed: false,
      priority: priority,
      createdAt: new Date().toISOString()
    };

    const currentTasks = StorageService.getData().tasks || [];
    await StorageService.updateSection('tasks', [newTask, ...currentTasks]);
    
    showToast('Tarefa criada com sucesso', 'success');
    renderTasks(container);
  });

  // Filtros de status (Todas, Pendentes, Concluídas)
  tasksEl.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-filter');
      renderTasks(container);
    });
  });

  // Busca em tempo real
  searchInput?.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    updateTasksListOnly(container, tasksEl);
  });

  // Limpar busca (ícone "x" ou botão de estado vazio)
  tasksEl.querySelector('#btn-clear-search')?.addEventListener('click', () => {
    currentSearch = '';
    renderTasks(container);
  });

  tasksEl.querySelector('#btn-empty-clear-search')?.addEventListener('click', () => {
    currentSearch = '';
    renderTasks(container);
  });

  // Ordenação
  const sortSelect = tasksEl.querySelector('#select-task-sort');
  sortSelect?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    updateTasksListOnly(container, tasksEl);
  });

  // Alternar conclusão de tarefa
  bindTaskActionButtons(container, tasksEl);
}

/**
 * Atualiza apenas o conteúdo da lista sem recriar os campos de input,
 * mantendo o foco e a digitação suave do usuário na busca
 */
function updateTasksListOnly(container, tasksEl) {
  const data = StorageService.getData();
  const allTasks = (data.tasks || []).map(t => ({
    ...t,
    priority: normalizePriority(t.priority)
  }));

  let filtered = allTasks;
  if (currentFilter === 'pending') filtered = allTasks.filter(t => !t.completed);
  if (currentFilter === 'completed') filtered = allTasks.filter(t => t.completed);

  const query = currentSearch.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(t => (t.title || '').toLowerCase().includes(query));
  }

  filtered = sortTasks(filtered, currentSort);

  const listContainer = tasksEl.querySelector('#tasks-list-container');
  if (listContainer) {
    listContainer.innerHTML = renderTaskListHtml(filtered, query, currentFilter, allTasks.length);
    bindTaskActionButtons(container, tasksEl);

    // Conecta botão de limpar na busca caso renderizado
    tasksEl.querySelector('#btn-empty-clear-search')?.addEventListener('click', () => {
      currentSearch = '';
      renderTasks(container);
    });
  }

  // Atualiza botão de limpar busca no input
  const searchWrapper = tasksEl.querySelector('.search-box-wrapper');
  const existingClearBtn = tasksEl.querySelector('#btn-clear-search');
  if (currentSearch && !existingClearBtn && searchWrapper) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn-clear-search';
    clearBtn.id = 'btn-clear-search';
    clearBtn.title = 'Limpar busca';
    clearBtn.innerHTML = getIcon('close');
    clearBtn.addEventListener('click', () => {
      currentSearch = '';
      renderTasks(container);
    });
    searchWrapper.appendChild(clearBtn);
  } else if (!currentSearch && existingClearBtn) {
    existingClearBtn.remove();
  }
}

/**
 * Vincula cliques nas ações das tarefas (toggle, edit, delete)
 */
function bindTaskActionButtons(container, tasksEl) {
  // Alternar conclusão
  tasksEl.querySelectorAll('.task-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentTasks = StorageService.getData().tasks || [];
      let nextStatus = false;

      const updated = currentTasks.map(t => {
        if (t.id === id) {
          nextStatus = !t.completed;
          return { ...t, completed: nextStatus };
        }
        return t;
      });

      await StorageService.updateSection('tasks', updated);
      showToast(nextStatus ? 'Tarefa concluída' : 'Tarefa reaberta', 'success');
      renderTasks(container);
    });
  });

  // Editar Tarefa (Modal Padronizado: Título + Prioridade)
  tasksEl.querySelectorAll('.task-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const currentTasks = StorageService.getData().tasks || [];
      const task = currentTasks.find(t => t.id === id);
      if (!task) return;

      const taskPriority = normalizePriority(task.priority);

      openModal({
        title: 'Editar Tarefa',
        contentHtml: `
          <div class="modal-field">
            <label class="modal-label" for="edit-task-input-title">Título da Tarefa</label>
            <input 
              type="text" 
              id="edit-task-input-title" 
              value="${escapeHtml(task.title)}" 
              placeholder="Digite o título da tarefa..."
              autocomplete="off"
            />
          </div>
          <div class="modal-field">
            <label class="modal-label" for="edit-task-select-priority">Prioridade</label>
            <select id="edit-task-select-priority" class="select-priority-input modal-select">
              <option value="${PRIORITY_LEVELS.BAIXA}" ${taskPriority === PRIORITY_LEVELS.BAIXA ? 'selected' : ''}>Baixa</option>
              <option value="${PRIORITY_LEVELS.NORMAL}" ${taskPriority === PRIORITY_LEVELS.NORMAL ? 'selected' : ''}>Normal</option>
              <option value="${PRIORITY_LEVELS.ALTA}" ${taskPriority === PRIORITY_LEVELS.ALTA ? 'selected' : ''}>Alta</option>
            </select>
          </div>
        `,
        confirmText: 'Salvar Alterações',
        onOpen: (dialog) => {
          const input = dialog.querySelector('#edit-task-input-title');
          if (input) {
            input.focus();
            input.select();
          }
        },
        onConfirm: async ({ dialog, setError }) => {
          const newTitleInput = dialog.querySelector('#edit-task-input-title');
          const newPrioritySelect = dialog.querySelector('#edit-task-select-priority');

          const newTitle = newTitleInput ? newTitleInput.value.trim() : '';
          const newPriority = normalizePriority(newPrioritySelect ? newPrioritySelect.value : PRIORITY_LEVELS.NORMAL);

          if (!newTitle) {
            setError('O título da tarefa não pode ficar vazio.');
            return false;
          }

          const updated = currentTasks.map(t => {
            if (t.id === id) {
              return { 
                ...t, 
                title: newTitle, 
                priority: newPriority 
              };
            }
            return t;
          });

          await StorageService.updateSection('tasks', updated);
          showToast('Tarefa atualizada', 'success');
          renderTasks(container);
          return true;
        }
      });
    });
  });

  // Excluir Tarefa
  tasksEl.querySelectorAll('.task-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentTasks = StorageService.getData().tasks || [];
      const updated = currentTasks.filter(t => t.id !== id);
      
      await StorageService.updateSection('tasks', updated);
      showToast('Tarefa excluída', 'info');
      renderTasks(container);
    });
  });
}

/**
 * Ordena lista de tarefas de acordo com o modo selecionado
 */
function sortTasks(tasksList, sortMode) {
  const list = [...tasksList];
  switch (sortMode) {
    case 'oldest':
      return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    case 'priority':
      return list.sort((a, b) => {
        const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
    case 'recent':
    default:
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
