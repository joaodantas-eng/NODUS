/**
 * Módulo Diário — Diário Pessoal & Reflexão Diária
 * Registro matinal de intenções e gratidão, fechamento noturno e histórico de reflexões
 * Sincronizado diretamente com a Home (Plano do Dia) e db.json
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';
import { getTodayDateString } from '../utils/dateUtils.js';

let selectedDate = getTodayDateString();

export function renderDiary(container) {
  const data = StorageService.getData();
  const diaryEntries = data.diary || [];
  const today = getTodayDateString();

  // Entrada do dia selecionado
  const currentEntry = diaryEntries.find(e => e.date === selectedDate) || {
    date: selectedDate,
    expected: (selectedDate === today ? (data.dailyPlan?.expectedOfDay || '') : ''),
    grateful: (selectedDate === today ? (data.dailyPlan?.gratitude || '') : ''),
    content: '',
    mood: 'focado'
  };

  container.innerHTML = `
    <div class="diary-view-layout">
      <!-- Coluna Principal: Editor do Diário -->
      <div class="diary-main-column">
        <div class="card diary-editor-card">
          <div class="diary-header-row">
            <div>
              <span class="diary-date-badge">${selectedDate === today ? 'Hoje' : 'Registro'}</span>
              <h2>Diário & Alinhamento</h2>
            </div>
            <div class="diary-date-picker-wrap">
              <label for="diary-date-picker">Data:</label>
              <input type="date" id="diary-date-picker" value="${selectedDate}" max="${today}" />
            </div>
          </div>

          <form id="form-diary-entry">
            <!-- Bloco Matinal (Sincronizado com Home) -->
            <div class="diary-block morning-block">
              <div class="block-badge morning">🌅 Intenção Matinal (Sincronizado com a Home)</div>
              
              <div class="form-group">
                <label for="diary-expected">O que você espera do dia de hoje?</label>
                <input 
                  type="text" 
                  id="diary-expected" 
                  value="${escapeHtml(currentEntry.expected || '')}" 
                  placeholder="Ex: Ter foco total nas entregas principais, treinar bem e manter a calma." 
                />
              </div>

              <div class="form-group">
                <label for="diary-grateful">Pelo que você é grato hoje?</label>
                <input 
                  type="text" 
                  id="diary-grateful" 
                  value="${escapeHtml(currentEntry.grateful || '')}" 
                  placeholder="Ex: Pela saúde, novas oportunidades e clareza mental." 
                />
              </div>
            </div>

            <!-- Bloco Noturno / Reflexão Geral -->
            <div class="diary-block evening-block">
              <div class="block-badge evening">🌙 Fechamento & Reflexão</div>

              <div class="form-group">
                <label for="diary-mood">Como você se sentiu hoje?</label>
                <div class="mood-selector-group" id="mood-selector">
                  ${[
                    { key: 'focado', emoji: '🎯', label: 'Focado' },
                    { key: 'produtivo', emoji: '⚡', label: 'Produtivo' },
                    { key: 'calmo', emoji: '🧘', label: 'Calmo' },
                    { key: 'cansado', emoji: '🔋', label: 'Cansado' },
                    { key: 'vencedor', emoji: '🏆', label: 'Vencedor' }
                  ].map(m => `
                    <button type="button" class="mood-btn ${currentEntry.mood === m.key ? 'active' : ''}" data-mood="${m.key}">
                      <span>${m.emoji}</span>
                      <span>${m.label}</span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="form-group">
                <label for="diary-content">Como foi o seu dia? Vitórias, aprendizados e notas:</label>
                <textarea 
                  id="diary-content" 
                  rows="6" 
                  placeholder="Escreva livremente sobre suas reflexões do dia..."
                >${escapeHtml(currentEntry.content || '')}</textarea>
              </div>
            </div>

            <div class="diary-save-bar">
              <span class="save-status-indicator" id="diary-save-status">Sincronizado</span>
              <button type="submit" class="btn btn-primary" id="btn-save-diary">
                ${getIcon('check')} Salvar Diário
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Coluna Lateral: Histórico de Registros (Sem botão adicionar, com exclusão) -->
      <div class="diary-history-column">
        <div class="card diary-history-card">
          <div class="card-header-clean">
            <h3>Registros Anteriores</h3>
            <span class="text-muted-xs">${diaryEntries.length} registros</span>
          </div>

          <div class="diary-history-list" id="diary-history-list">
            ${diaryEntries.length === 0 ? `
              <p class="text-muted-xs" style="text-align: center; padding: 16px;">Nenhum registro anterior.</p>
            ` : diaryEntries.slice().sort((a, b) => b.date.localeCompare(a.date)).map(entry => `
              <div class="diary-history-item ${entry.date === selectedDate ? 'active' : ''}" data-date="${entry.date}">
                <div class="hist-top">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="hist-date">${formatDisplayDate(entry.date)}</span>
                    <span class="hist-mood-badge">${getMoodEmoji(entry.mood)}</span>
                  </div>
                  <button type="button" class="btn-del-diary-entry" data-del-id="${entry.id || entry.date}" title="Excluir este registro">
                    ${getIcon('trash')}
                  </button>
                </div>
                <div class="hist-snippet">
                  ${escapeHtml(entry.expected || entry.content || 'Registro sem texto')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Seletor de Data
  const datePicker = container.querySelector('#diary-date-picker');
  datePicker.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    renderDiary(container);
  });

  // Seletor de Humor
  let selectedMood = currentEntry.mood || 'focado';
  container.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMood = btn.getAttribute('data-mood');
    });
  });

  // Salvar Diário
  const form = container.querySelector('#form-diary-entry');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const expected = container.querySelector('#diary-expected').value.trim();
    const grateful = container.querySelector('#diary-grateful').value.trim();
    const content = container.querySelector('#diary-content').value.trim();

    const currentEntries = StorageService.getData().diary || [];
    const existingIndex = currentEntries.findIndex(item => item.date === selectedDate);

    const updatedEntry = {
      id: existingIndex >= 0 ? currentEntries[existingIndex].id : `diary-${Date.now()}`,
      date: selectedDate,
      expected,
      grateful,
      content,
      mood: selectedMood,
      createdAt: existingIndex >= 0 ? currentEntries[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newEntries;
    if (existingIndex >= 0) {
      newEntries = currentEntries.map((it, idx) => idx === existingIndex ? updatedEntry : it);
    } else {
      newEntries = [updatedEntry, ...currentEntries];
    }

    await StorageService.updateSection('diary', newEntries);

    // Se for o dia de hoje, sincroniza também o dailyPlan da Home
    if (selectedDate === today) {
      await StorageService.updateDailyPlan({
        expectedOfDay: expected,
        gratitude: grateful
      });
    }

    const saveStatus = container.querySelector('#diary-save-status');
    if (saveStatus) {
      saveStatus.textContent = 'Salvo com sucesso!';
      saveStatus.style.color = 'var(--success)';
      setTimeout(() => {
        renderDiary(container);
      }, 500);
    }
  });

  // Clicar em registro histórico para carregar
  container.querySelectorAll('.diary-history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Se clicou no botão de deletar, não carrega
      if (e.target.closest('.btn-del-diary-entry')) return;
      const date = item.getAttribute('data-date');
      if (date) {
        selectedDate = date;
        renderDiary(container);
      }
    });
  });

  // Excluir registro histórico anterior
  container.querySelectorAll('.btn-del-diary-entry').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const delId = btn.getAttribute('data-del-id');
      const currentEntries = StorageService.getData().diary || [];
      const updated = currentEntries.filter(item => (item.id !== delId && item.date !== delId));
      await StorageService.updateSection('diary', updated);
      renderDiary(container);
    });
  });
}

function getMoodEmoji(mood) {
  const map = {
    focado: '🎯',
    produtivo: '⚡',
    calmo: '🧘',
    cansado: '🔋',
    vencedor: '🏆'
  };
  return map[mood] || '📝';
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
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
