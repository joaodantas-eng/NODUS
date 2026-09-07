/**
 * Módulo Desafios — Gestão de Desafios & Consistência do Nodus
 * Permite criar novos desafios personalizados com objetivos, quantidade de dias,
 * regras e pilares, além de acompanhar o check-in diário e progresso.
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';
import { getTodayDateString } from '../utils/dateUtils.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let activeChallengeId = null;

export function renderChallenges(container) {
  const data = StorageService.getData();
  let challenges = data.challenges || [];

  if (challenges.length === 0) {
    // Inicializa padrão caso não haja
    challenges = [
      {
        id: 'nodus-21',
        title: 'Desafio Nodus 21',
        description: '21 dias para transformar sua rotina, hábitos e construir foco inabalável.',
        daysTotal: 21,
        daysRemaining: 21,
        active: true,
        progress: 0,
        checkins: [],
        pillars: [
          { title: 'Despertar Focado', desc: 'Acorde no mesmo horário e passe os primeiros 30 minutos sem telas.' },
          { title: 'Movimento & Treino', desc: 'Pratique ao menos 45 minutos de atividade física e beba 2.5L de água.' },
          { title: 'Bloco de Deep Work', desc: 'Execute ao menos 90 minutos de foco absoluto na sua prioridade principal.' },
          { title: 'Diário & Reflexão', desc: 'Finalize o dia registrando suas vitórias e lições no Diário.' }
        ]
      }
    ];
  }

  // Desafio ativo selecionado
  const activeChallenge = challenges.find(c => c.id === activeChallengeId) || challenges[0];
  activeChallengeId = activeChallenge.id;

  const today = getTodayDateString();
  const checkins = activeChallenge.checkins || [];
  const hasCheckedInToday = checkins.includes(today);
  const totalCompleted = checkins.length;
  const daysTotal = parseInt(activeChallenge.daysTotal) || 21;
  const progressPercent = Math.min(100, Math.round((totalCompleted / daysTotal) * 100));
  const daysRemaining = Math.max(0, daysTotal - totalCompleted);

  const pillars = activeChallenge.pillars && activeChallenge.pillars.length > 0 ? activeChallenge.pillars : [
    { title: 'Foco Diário', desc: 'Concluir a prioridade número 1 do dia.' },
    { title: 'Consistência', desc: 'Não quebrar a sequência por dois dias consecutivos.' },
    { title: 'Saúde & Disposição', desc: 'Cuidar do corpo, sono e hidratação.' }
  ];

  container.innerHTML = `
    <div class="challenge-layout">
      <!-- Barra Superior de Desafios com Seletor e Botão Criar Desafio -->
      <div class="challenge-top-nav" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap;">
        <div class="finance-pills-selector">
          ${challenges.map(c => `
            <button type="button" class="fin-pill-btn challenge-tab-btn ${c.id === activeChallengeId ? 'active' : ''}" data-id="${c.id}">
              🔥 ${escapeHtml(c.title)}
            </button>
          `).join('')}
        </div>

        <button type="button" class="btn btn-primary" id="btn-create-challenge">
          ${getIcon('plus')}
          <span>Criar Novo Desafio</span>
        </button>
      </div>

      <!-- Card Destaque do Desafio Ativo -->
      <div class="card challenge-hero-card">
        <div class="challenge-hero-header">
          <div class="challenge-badge-pill">
            <span class="flame">🔥</span>
            <span>${escapeHtml(activeChallenge.title)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="challenge-countdown">${daysRemaining} dias restantes</span>
            ${challenges.length > 1 ? `
              <button type="button" class="action-icon-btn" id="btn-delete-challenge" title="Excluir desafio atual">
                ${getIcon('trash')}
              </button>
            ` : ''}
          </div>
        </div>

        <div class="challenge-hero-body">
          <h2>${escapeHtml(activeChallenge.title)}</h2>
          <p class="challenge-desc">${escapeHtml(activeChallenge.description || 'Desafio de consistência e alta performance.')}</p>

          <div class="challenge-progress-container">
            <div class="progress-info-row">
              <span class="progress-label">Progresso do Desafio</span>
              <span class="progress-percent">${progressPercent}% (${totalCompleted}/${daysTotal} dias concluídos)</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <div class="challenge-actions-row">
            <button type="button" class="btn btn-primary btn-checkin ${hasCheckedInToday ? 'completed' : ''}" id="btn-toggle-checkin">
              ${hasCheckedInToday ? `${getIcon('check')} Check-in Realizado Hoje!` : `🔥 Fazer Check-in de Hoje (${formatDateShort(today)})`}
            </button>
            <span class="checkin-hint">${hasCheckedInToday ? 'Excelente! Consistência mantida para hoje.' : 'Clique no botão acima para registrar o dia de hoje.'}</span>
          </div>
        </div>
      </div>

      <!-- Grade dos Dias do Desafio -->
      <div class="card challenge-grid-card">
        <div class="card-header-clean">
          <h3>Jornada de ${daysTotal} Dias</h3>
          <span class="text-muted-xs">${totalCompleted} de ${daysTotal} dias cumpridos</span>
        </div>

        <div class="days-21-grid" id="days-grid-container" style="grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));">
          ${Array.from({ length: daysTotal }, (_, i) => {
            const dayNumber = i + 1;
            const isDone = i < totalCompleted;
            const isCurrent = i === totalCompleted && !hasCheckedInToday;
            return `
              <div class="day-slot ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
                <div class="day-num">D${dayNumber}</div>
                <div class="day-status-icon">
                  ${isDone ? getIcon('check') : (isCurrent ? '🔥' : '⏳')}
                </div>
                <div class="day-label">${isDone ? 'Feito' : (isCurrent ? 'Hoje' : 'Falta')}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Pilares e Regras do Desafio Criado -->
      <div class="card challenge-pillars-card">
        <div class="card-header-clean">
          <h3>Regras & Pilares do Desafio</h3>
          <span class="text-muted-xs">${pillars.length} pilares fundamentais</span>
        </div>

        <div class="pillars-grid">
          ${pillars.map((p, idx) => `
            <div class="pillar-item">
              <span class="pillar-num">${idx + 1}</span>
              <div class="pillar-content">
                <h4>${escapeHtml(p.title)}</h4>
                <p>${escapeHtml(p.desc)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Trocar de Desafio Selecionado
  container.querySelectorAll('.challenge-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeChallengeId = btn.getAttribute('data-id');
      renderChallenges(container);
    });
  });

  // Check-in Diário
  const checkinBtn = container.querySelector('#btn-toggle-checkin');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', async () => {
      const currentChallenges = StorageService.getData().challenges || [];
      const chIdx = currentChallenges.findIndex(c => c.id === activeChallengeId);
      if (chIdx < 0) return;

      const ch = currentChallenges[chIdx];
      let newCheckins = [...(ch.checkins || [])];

      if (hasCheckedInToday) {
        newCheckins = newCheckins.filter(d => d !== today);
      } else {
        newCheckins.push(today);
      }

      const totalD = parseInt(ch.daysTotal) || 21;
      currentChallenges[chIdx] = {
        ...ch,
        checkins: newCheckins,
        progress: Math.min(100, Math.round((newCheckins.length / totalD) * 100)),
        daysRemaining: Math.max(0, totalD - newCheckins.length)
      };

      await StorageService.updateSection('challenges', currentChallenges);
      const headerChallengeText = document.querySelector('#header-challenge-btn .challenge-text');
      if (headerChallengeText) {
        headerChallengeText.textContent = `${currentChallenges[chIdx].daysRemaining} dias restantes do ${ch.title || 'Desafio Escape21'}`;
      }
      showToast(hasCheckedInToday ? 'Check-in desmarcado' : 'Check-in do desafio registrado!', 'success');
      renderChallenges(container);
    });
  }

  // Botão Criar Novo Desafio
  container.querySelector('#btn-create-challenge')?.addEventListener('click', () => {
    openCreateChallengeModal(container);
  });

  // Botão Excluir Desafio Atual
  container.querySelector('#btn-delete-challenge')?.addEventListener('click', () => {
    confirmModal({
      title: 'Excluir Desafio',
      message: `Deseja realmente excluir o desafio "${activeChallenge.title}"?`,
      confirmText: 'Excluir Desafio',
      onConfirm: async () => {
        const currentChallenges = StorageService.getData().challenges || [];
        const updated = currentChallenges.filter(c => c.id !== activeChallengeId);
        activeChallengeId = updated[0]?.id || null;
        await StorageService.updateSection('challenges', updated);
        showToast('Desafio excluído com sucesso!', 'success');
        renderChallenges(container);
        return true;
      }
    });
  });
}

function openCreateChallengeModal(container) {
  const contentHtml = `
    <div class="form-group" style="margin-bottom: 14px;">
      <label for="ch-title" style="display: block; margin-bottom: 6px; font-weight: 500;">Nome do Desafio</label>
      <input type="text" id="ch-title" placeholder="Ex: Desafio 30 Dias de Foco Total" required style="width: 100%;" />
    </div>

    <div class="form-group" style="margin-bottom: 14px;">
      <label for="ch-desc" style="display: block; margin-bottom: 6px; font-weight: 500;">Objetivo Principal do Desafio</label>
      <textarea id="ch-desc" rows="2" placeholder="Qual a transformação ou meta que você busca alcançar com esse desafio?" style="width: 100%;"></textarea>
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label for="ch-days" style="display: block; margin-bottom: 6px; font-weight: 500;">Quantidade de Dias de Duração</label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="tab-pill day-preset-btn" data-days="7">7 dias</button>
        <button type="button" class="tab-pill day-preset-btn" data-days="14">14 dias</button>
        <button type="button" class="tab-pill day-preset-btn active" data-days="21">21 dias</button>
        <button type="button" class="tab-pill day-preset-btn" data-days="30">30 dias</button>
        <button type="button" class="tab-pill day-preset-btn" data-days="60">60 dias</button>
        <button type="button" class="tab-pill day-preset-btn" data-days="90">90 dias</button>
      </div>
      <input type="number" id="ch-days" min="1" max="365" value="21" style="width: 100%; margin-top: 8px;" />
    </div>

    <div class="form-group" style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label style="font-weight: 500;">Regras e Pilares Diários</label>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-pillar" style="padding: 4px 8px; font-size: 11.5px;">
          + Adicionar Pilar
        </button>
      </div>
      <div id="pillars-inputs-container" style="display: flex; flex-direction: column; gap: 10px;">
        <div class="pillar-input-row" style="display: flex; gap: 8px; align-items: center;">
          <input type="text" class="pillar-input-title" placeholder="Nome do Pilar (Ex: Treino)" style="flex: 1;" value="Rotina Matinal" />
          <input type="text" class="pillar-input-desc" placeholder="Regra (Ex: Acordar às 06:00)" style="flex: 2;" value="Sem redes sociais ao acordar" />
        </div>
        <div class="pillar-input-row" style="display: flex; gap: 8px; align-items: center;">
          <input type="text" class="pillar-input-title" placeholder="Nome do Pilar" style="flex: 1;" value="Foco & Produtividade" />
          <input type="text" class="pillar-input-desc" placeholder="Regra" style="flex: 2;" value="Completar prioridade antes do almoço" />
        </div>
        <div class="pillar-input-row" style="display: flex; gap: 8px; align-items: center;">
          <input type="text" class="pillar-input-title" placeholder="Nome do Pilar" style="flex: 1;" value="Corpo & Saúde" />
          <input type="text" class="pillar-input-desc" placeholder="Regra" style="flex: 2;" value="Beber 2.5L de água e treinar" />
        </div>
      </div>
    </div>
  `;

  openModal({
    title: 'Criar Novo Desafio',
    contentHtml,
    confirmText: 'Criar Desafio',
    onOpen: (modalParam) => {
      const dialog = modalParam?.dialog || modalParam;
      if (!dialog || !dialog.querySelector) return;
      
      const daysInput = dialog.querySelector('#ch-days');
      const presetBtns = dialog.querySelectorAll('.day-preset-btn');

      presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          presetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const chosenDays = btn.getAttribute('data-days');
          if (daysInput) {
            daysInput.value = chosenDays;
            daysInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });

      daysInput?.addEventListener('input', () => {
        const val = String(daysInput.value);
        presetBtns.forEach(b => {
          if (b.getAttribute('data-days') === val) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      });

      const addPillarBtn = dialog.querySelector('#btn-add-pillar');
      const pillarsContainer = dialog.querySelector('#pillars-inputs-container');

      addPillarBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const row = document.createElement('div');
        row.className = 'pillar-input-row';
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.innerHTML = `
          <input type="text" class="pillar-input-title" placeholder="Nome do Pilar" style="flex: 1;" />
          <input type="text" class="pillar-input-desc" placeholder="Regra" style="flex: 2;" />
          <button type="button" class="btn-danger-subtle btn-remove-row" style="padding: 6px; cursor: pointer;">&times;</button>
        `;
        row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
        pillarsContainer.appendChild(row);
      });
    },
    onConfirm: async ({ dialog, setError }) => {
      const title = dialog.querySelector('#ch-title')?.value.trim();
      const desc = dialog.querySelector('#ch-desc')?.value.trim();
      const daysTotal = parseInt(dialog.querySelector('#ch-days')?.value) || 21;

      if (!title) {
        setError('Por favor, informe um título para o desafio.');
        return false;
      }

      if (daysTotal <= 0) {
        setError('A quantidade de dias deve ser maior que zero.');
        return false;
      }

      // Coleta os pilares
      const pillars = [];
      dialog.querySelectorAll('.pillar-input-row').forEach(row => {
        const pTitle = row.querySelector('.pillar-input-title')?.value.trim();
        const pDesc = row.querySelector('.pillar-input-desc')?.value.trim();
        if (pTitle) {
          pillars.push({ title: pTitle, desc: pDesc || '' });
        }
      });

      const newChallenge = {
        id: `challenge-${Date.now()}`,
        title,
        description: desc || 'Desafio de consistência e disciplina.',
        daysTotal,
        daysRemaining: daysTotal,
        active: true,
        progress: 0,
        checkins: [],
        pillars: pillars.length > 0 ? pillars : [
          { title: 'Regra Principal', desc: 'Cumprir os compromissos todos os dias.' }
        ],
        createdAt: new Date().toISOString()
      };

      const currentData = StorageService.getData();
      const existing = currentData.challenges || [];
      const updated = [newChallenge, ...existing];

      activeChallengeId = newChallenge.id;
      await StorageService.updateSection('challenges', updated);

      showToast('Desafio criado com sucesso!', 'success');
      renderChallenges(container);
      return true;
    }
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
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
