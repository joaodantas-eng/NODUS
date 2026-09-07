/**
 * Módulo Treinos — Planejamento de Treino e Registro de Cargas do Nodus
 * Suporte completo para: Inserir Treino, Editar Treino, Excluir Treino,
 * Inserir Exercício, Editar Exercício e Excluir Exercício.
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';
import { getTodayDateString } from '../utils/dateUtils.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let activeWorkoutIndex = 0;

export function renderWorkouts(container) {
  const data = StorageService.getData();
  const workouts = data.workouts || [];
  const today = getTodayDateString();

  if (activeWorkoutIndex >= workouts.length && workouts.length > 0) {
    activeWorkoutIndex = 0;
  }

  const currentWorkout = workouts[activeWorkoutIndex];
  const isCompletedToday = currentWorkout?.history?.some(h => h.date === today && h.completed);

  container.innerHTML = `
    <div class="workouts-layout">
      <!-- Toolbar Superior: Abas de Treino e Botões de Ação -->
      <div class="workouts-toolbar" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <div class="finance-pills-selector" id="workout-tabs">
          ${workouts.map((w, index) => `
            <button type="button" class="fin-pill-btn ${index === activeWorkoutIndex ? 'active' : ''}" data-index="${index}">
              💪 ${escapeHtml(w.title || `Treino ${index + 1}`)}
            </button>
          `).join('')}
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-workout" title="Criar nova divisão de treino" style="padding: 6px 12px;">
            ${getIcon('plus')} Novo Treino
          </button>
        </div>

        ${currentWorkout ? `
        <div class="workout-top-actions" style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn btn-secondary" id="btn-add-exercise">
            ${getIcon('plus')}
            <span>Adicionar Exercício</span>
          </button>
          <button type="button" class="btn btn-primary ${isCompletedToday ? 'btn-done-today' : ''}" id="btn-toggle-workout-done">
            ${isCompletedToday ? `${getIcon('check')} Treino Concluído Hoje` : 'Marcar Treino Feito'}
          </button>
        </div>` : ''}
      </div>

      <!-- Detalhes do Treino Selecionado -->
      ${!currentWorkout ? `
        <div class="card empty-state-card" style="text-align: center; padding: 48px 24px;">
          <span class="empty-icon" style="font-size: 36px; display: block; margin-bottom: 12px;">🏋️‍♂️</span>
          <h3>Nenhum treino cadastrado</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Crie sua primeira divisão de treino (ex: Treino A - Peito e Tríceps) para registrar seus exercícios e cargas.</p>
          <button type="button" class="btn btn-primary" id="btn-create-first-workout">
            ${getIcon('plus')} Criar Primeiro Treino
          </button>
        </div>
      ` : `
        <div class="card workout-detail-card">
          <div class="workout-header-row" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="font-size: 18px; font-weight: 600;">${escapeHtml(currentWorkout.title)}</h2>
                <button type="button" class="action-icon-btn btn-edit-workout" title="Editar nome do treino">
                  ${getIcon('edit')}
                </button>
              </div>
              <span class="text-muted-xs">${(currentWorkout.exercises || []).length} exercícios cadastrados</span>
            </div>

            <button type="button" class="action-icon-btn btn-del-workout" title="Excluir esta divisão de treino">
              ${getIcon('trash')}
            </button>
          </div>

          <!-- Tabela de Exercícios -->
          <div class="exercises-table-container">
            <table class="exercises-table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="width: 40px; padding: 8px 12px; text-align: left;">#</th>
                  <th style="padding: 8px 12px; text-align: left;">Exercício</th>
                  <th style="width: 90px; text-align: center; padding: 8px 12px;">Séries</th>
                  <th style="width: 90px; text-align: center; padding: 8px 12px;">Reps</th>
                  <th style="width: 110px; text-align: center; padding: 8px 12px;">Carga</th>
                  <th style="width: 90px; text-align: center; padding: 8px 12px;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${(currentWorkout.exercises || []).length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
                      Nenhum exercício cadastrado. Clique em <strong>"Adicionar Exercício"</strong> acima para começar.
                    </td>
                  </tr>
                ` : currentWorkout.exercises.map((ex, i) => `
                  <tr data-ex-id="${ex.id}" style="border-bottom: 1px solid var(--border-subtle);">
                    <td class="ex-index" style="padding: 10px 12px; color: var(--text-muted);">${i + 1}</td>
                    <td class="ex-name" style="padding: 10px 12px;">
                      <strong style="color: var(--text-primary); font-size: 13.5px;">${escapeHtml(ex.name)}</strong>
                      ${ex.notes ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(ex.notes)}</div>` : ''}
                    </td>
                    <td class="ex-num" style="text-align: center; padding: 10px 12px;">
                      <span class="tag-pill" style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 12px;">${ex.sets || 3}x</span>
                    </td>
                    <td class="ex-num" style="text-align: center; padding: 10px 12px;">
                      <span class="tag-pill" style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 12px;">${ex.reps || 10}</span>
                    </td>
                    <td class="ex-weight" style="text-align: center; padding: 10px 12px;">
                      <span class="weight-highlight" style="color: var(--accent); font-weight: 600; font-size: 13px;">${ex.weight || 0} kg</span>
                    </td>
                    <td style="text-align: center; padding: 10px 12px;">
                      <div style="display: flex; gap: 6px; justify-content: center;">
                        <button type="button" class="action-icon-btn btn-edit-exercise" data-ex-id="${ex.id}" title="Editar exercício">
                          ${getIcon('edit')}
                        </button>
                        <button type="button" class="action-icon-btn btn-del-exercise" data-ex-id="${ex.id}" title="Excluir exercício">
                          ${getIcon('trash')}
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;

  // Ouvintes de Seleção de Treino
  container.querySelectorAll('#workout-tabs .fin-pill-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      activeWorkoutIndex = parseInt(tab.getAttribute('data-index'), 10) || 0;
      renderWorkouts(container);
    });
  });

  // Inserir Treino (Novo Treino ou Primeiro Treino)
  ['#btn-add-workout', '#btn-create-first-workout'].forEach(selector => {
    const btn = container.querySelector(selector);
    if (btn) {
      btn.addEventListener('click', () => {
        openWorkoutModal(container);
      });
    }
  });

  // Editar Treino
  const editWorkoutBtn = container.querySelector('.btn-edit-workout');
  if (editWorkoutBtn && currentWorkout) {
    editWorkoutBtn.addEventListener('click', () => {
      openWorkoutModal(container, currentWorkout);
    });
  }

  // Excluir Treino
  const delWorkoutBtn = container.querySelector('.btn-del-workout');
  if (delWorkoutBtn && currentWorkout) {
    delWorkoutBtn.addEventListener('click', () => {
      confirmModal({
        title: 'Excluir Divisão de Treino',
        message: `Deseja realmente excluir a divisão "${currentWorkout.title}" e todos os seus exercícios?`,
        confirmText: 'Excluir Treino',
        onConfirm: async () => {
          const allWorkouts = StorageService.getData().workouts || [];
          const updated = allWorkouts.filter((_, idx) => idx !== activeWorkoutIndex);
          activeWorkoutIndex = 0;
          await StorageService.updateSection('workouts', updated);
          showToast('Treino excluído com sucesso!', 'success');
          renderWorkouts(container);
          return true;
        }
      });
    });
  }

  // Adicionar Exercício
  const addExBtn = container.querySelector('#btn-add-exercise');
  if (addExBtn && currentWorkout) {
    addExBtn.addEventListener('click', () => {
      openExerciseModal(container, currentWorkout);
    });
  }

  // Editar Exercício
  container.querySelectorAll('.btn-edit-exercise').forEach(btn => {
    btn.addEventListener('click', () => {
      const exId = btn.getAttribute('data-ex-id');
      const ex = (currentWorkout.exercises || []).find(e => e.id === exId);
      if (ex) {
        openExerciseModal(container, currentWorkout, ex);
      }
    });
  });

  // Excluir Exercício
  container.querySelectorAll('.btn-del-exercise').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const exId = btn.getAttribute('data-ex-id');
      const ex = (currentWorkout.exercises || []).find(e => e.id === exId);
      if (!exId) return;

      confirmModal({
        title: 'Remover Exercício',
        message: `Deseja remover o exercício "${ex?.name || 'Selecionado'}" deste treino?`,
        confirmText: 'Remover',
        onConfirm: async () => {
          const allWorkouts = StorageService.getData().workouts || [];
          const updated = allWorkouts.map((w, idx) => {
            if (idx !== activeWorkoutIndex) return w;
            return {
              ...w,
              exercises: (w.exercises || []).filter(item => item.id !== exId)
            };
          });
          await StorageService.updateSection('workouts', updated);
          showToast('Exercício removido!', 'success');
          renderWorkouts(container);
          return true;
        }
      });
    });
  });

  // Marcar Treino Feito Hoje
  const doneTodayBtn = container.querySelector('#btn-toggle-workout-done');
  if (doneTodayBtn && currentWorkout) {
    doneTodayBtn.addEventListener('click', async () => {
      const allWorkouts = StorageService.getData().workouts || [];
      const updated = allWorkouts.map((w, idx) => {
        if (idx !== activeWorkoutIndex) return w;
        let history = [...(w.history || [])];
        if (isCompletedToday) {
          history = history.filter(h => h.date !== today);
        } else {
          history.push({ id: `wh-${Date.now()}`, date: today, completed: true });
        }
        return { ...w, history };
      });
      await StorageService.updateSection('workouts', updated);
      showToast(isCompletedToday ? 'Treino desmarcado' : 'Parabéns pelo treino de hoje!', 'success');
      renderWorkouts(container);
    });
  }
}

// Modal para Criar ou Editar Treino
function openWorkoutModal(container, workoutToEdit = null) {
  const isEditing = !!workoutToEdit;
  const contentHtml = `
    <div class="form-group" style="margin-bottom: 14px;">
      <label for="workout-title-input" style="display: block; margin-bottom: 6px; font-weight: 500;">Nome da Divisão de Treino</label>
      <input 
        type="text" 
        id="workout-title-input" 
        placeholder="Ex: Treino A - Peito, Ombro e Tríceps" 
        value="${escapeHtml(workoutToEdit?.title || '')}" 
        required 
        style="width: 100%;" 
      />
    </div>
  `;

  openModal({
    title: isEditing ? 'Editar Treino' : 'Novo Treino',
    contentHtml,
    confirmText: isEditing ? 'Salvar Alterações' : 'Criar Treino',
    onOpen: (dialog) => {
      dialog.querySelector('#workout-title-input')?.focus();
    },
    onConfirm: async ({ dialog, setError }) => {
      const title = dialog.querySelector('#workout-title-input')?.value.trim();
      if (!title) {
        setError('Por favor, informe o nome do treino.');
        return false;
      }

      const allWorkouts = [...(StorageService.getData().workouts || [])];

      if (isEditing) {
        const idx = allWorkouts.findIndex(w => w.id === workoutToEdit.id);
        if (idx >= 0) {
          allWorkouts[idx] = { ...allWorkouts[idx], title };
        }
      } else {
        const newWorkout = {
          id: `workout-${Date.now()}`,
          title,
          createdAt: new Date().toISOString(),
          exercises: [],
          history: []
        };
        allWorkouts.push(newWorkout);
        activeWorkoutIndex = allWorkouts.length - 1;
      }

      await StorageService.updateSection('workouts', allWorkouts);
      showToast(isEditing ? 'Treino atualizado!' : 'Treino criado com sucesso!', 'success');
      renderWorkouts(container);
      return true;
    }
  });
}

// Modal para Criar ou Editar Exercício
function openExerciseModal(container, currentWorkout, exerciseToEdit = null) {
  const isEditing = !!exerciseToEdit;

  const contentHtml = `
    <div class="form-group" style="margin-bottom: 14px;">
      <label for="ex-name-input" style="display: block; margin-bottom: 6px; font-weight: 500;">Nome do Exercício</label>
      <input 
        type="text" 
        id="ex-name-input" 
        placeholder="Ex: Supino Reto com Barra" 
        value="${escapeHtml(exerciseToEdit?.name || '')}" 
        required 
        style="width: 100%;" 
      />
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 14px;">
      <div class="form-group" style="flex: 1;">
        <label for="ex-sets-input" style="display: block; margin-bottom: 6px; font-weight: 500;">Séries</label>
        <input type="number" id="ex-sets-input" min="1" max="20" value="${exerciseToEdit?.sets || 4}" required style="width: 100%;" />
      </div>
      <div class="form-group" style="flex: 1;">
        <label for="ex-reps-input" style="display: block; margin-bottom: 6px; font-weight: 500;">Repetições</label>
        <input type="number" id="ex-reps-input" min="1" max="100" value="${exerciseToEdit?.reps || 10}" required style="width: 100%;" />
      </div>
      <div class="form-group" style="flex: 1;">
        <label for="ex-weight-input" style="display: block; margin-bottom: 6px; font-weight: 500;">Carga (kg)</label>
        <input type="number" step="0.5" id="ex-weight-input" min="0" value="${exerciseToEdit?.weight || 0}" style="width: 100%;" />
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label for="ex-notes-input" style="display: block; margin-bottom: 6px; font-weight: 500;">Observações / Descanso (opcional)</label>
      <input 
        type="text" 
        id="ex-notes-input" 
        placeholder="Ex: Descanso de 90s, focar na cadência" 
        value="${escapeHtml(exerciseToEdit?.notes || '')}" 
        style="width: 100%;" 
      />
    </div>
  `;

  openModal({
    title: isEditing ? 'Editar Exercício' : 'Adicionar Exercício',
    contentHtml,
    confirmText: isEditing ? 'Salvar Exercício' : 'Adicionar',
    onOpen: (dialog) => {
      dialog.querySelector('#ex-name-input')?.focus();
    },
    onConfirm: async ({ dialog, setError }) => {
      const name = dialog.querySelector('#ex-name-input')?.value.trim();
      const sets = parseInt(dialog.querySelector('#ex-sets-input')?.value) || 3;
      const reps = parseInt(dialog.querySelector('#ex-reps-input')?.value) || 10;
      const weight = parseFloat(dialog.querySelector('#ex-weight-input')?.value) || 0;
      const notes = dialog.querySelector('#ex-notes-input')?.value.trim() || '';

      if (!name) {
        setError('Por favor, informe o nome do exercício.');
        return false;
      }

      const allWorkouts = StorageService.getData().workouts || [];
      const updated = allWorkouts.map((w, idx) => {
        if (idx !== activeWorkoutIndex) return w;
        let exercises = [...(w.exercises || [])];

        if (isEditing) {
          exercises = exercises.map(item => item.id === exerciseToEdit.id ? {
            ...item,
            name,
            sets,
            reps,
            weight,
            notes
          } : item);
        } else {
          exercises.push({
            id: `ex-${Date.now()}`,
            name,
            sets,
            reps,
            weight,
            notes
          });
        }

        return { ...w, exercises };
      });

      await StorageService.updateSection('workouts', updated);
      showToast(isEditing ? 'Exercício atualizado!' : 'Exercício adicionado!', 'success');
      renderWorkouts(container);
      return true;
    }
  });
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
