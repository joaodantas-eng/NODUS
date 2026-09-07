/**
 * Módulo de Hábitos — Consistência & Rotinas Diárias
 * Indicadores, Gráfico de Desempenho (Dia, Semana, Mês, Ano),
 * Histórico Visual dos Últimos 30 Dias e Marcação Retroativa estritamente validada.
 */
import { StorageService } from '../services/storageService.js';
import { generateId } from '../utils/idGenerator.js';
import { getTodayDateString, calculateStreak, getLast7Days, formatDateBR } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let activePeriodFilter = 'month'; // 'day' | 'week' | 'month' | 'year'
let selectedHistoryDate = getTodayDateString();

/**
 * Valida se uma data é permitida para edição retroativa (últimos 30 dias e até hoje)
 */
function isDateWithin30DaysWindow(dateStr, todayStr) {
  if (!dateStr || !todayStr) return false;
  if (dateStr > todayStr) return false; // Bloqueia datas futuras

  const today = new Date(todayStr + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 30;
}

/**
 * Gera os últimos 31 dias (de hoje até 30 dias atrás)
 */
function getLast30DaysList(todayStr) {
  const days = [];
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date(todayStr + 'T00:00:00');

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;

    days.push({
      dateStr,
      dayNum,
      weekday: weekdays[d.getDay()],
      isToday: i === 0,
      isYesterday: i === 1,
      daysAgo: i,
      displayShort: `${dayNum}/${m}`
    });
  }
  return days;
}

/**
 * Calcula a taxa de consistência para o período selecionado
 */
function calculatePeriodMetrics(habits, period, todayStr) {
  const totalHabits = habits.length;
  if (totalHabits === 0) {
    return { rate: 0, completedCount: 0, totalPossible: 0, label: 'Nenhum hábito cadastrado' };
  }

  const today = new Date(todayStr + 'T00:00:00');
  let daysToCheck = [];

  if (period === 'day') {
    daysToCheck.push(todayStr);
  } else if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      daysToCheck.push(`${y}-${m}-${dayNum}`);
    }
  } else if (period === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      daysToCheck.push(`${y}-${m}-${dayNum}`);
    }
  } else if (period === 'year') {
    // Ano atual: dias do ano até hoje
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const diffDays = Math.round((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = diffDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      daysToCheck.push(`${y}-${m}-${dayNum}`);
    }
  }

  let completedCount = 0;
  const totalPossible = daysToCheck.length * totalHabits;

  daysToCheck.forEach(dateStr => {
    habits.forEach(h => {
      if ((h.completedDates || []).includes(dateStr)) {
        completedCount++;
      }
    });
  });

  const rate = totalPossible > 0 ? (completedCount / totalPossible) * 100 : 0;
  return {
    rate: Math.round(rate),
    completedCount,
    totalPossible,
    daysCount: daysToCheck.length
  };
}

/**
 * Renderiza gráfico visual em SVG baseado no período selecionado
 */
function renderPerformanceChart(habits, period, todayStr) {
  const totalHabits = habits.length;

  if (totalHabits === 0) {
    return `
      <div style="padding: 32px 0; text-align: center; color: var(--text-muted); font-size: 13px;">
        Cadastre seus hábitos para começar a acompanhar o gráfico de desempenho.
      </div>
    `;
  }

  const today = new Date(todayStr + 'T00:00:00');

  // MODO 1: DIA (Hoje)
  if (period === 'day') {
    const doneToday = habits.filter(h => (h.completedDates || []).includes(todayStr)).length;
    const pendingToday = totalHabits - doneToday;
    const pct = Math.round((doneToday / totalHabits) * 100);

    return `
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 4px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
          <span style="color: var(--text-secondary);">Progresso do Dia:</span>
          <span style="font-weight: 700; color: ${pct === 100 ? '#10B981' : 'var(--accent)'}; font-size: 14px;">
            ${doneToday} de ${totalHabits} hábitos (${pct}%)
          </span>
        </div>

        <div style="height: 12px; background: rgba(255, 255, 255, 0.06); border-radius: 999px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: ${pct === 100 ? '#10B981' : 'var(--accent)'}; border-radius: 999px; transition: width 0.3s ease;"></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-top: 6px;">
          ${habits.map(h => {
            const isDone = (h.completedDates || []).includes(todayStr);
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 12px;">
                <span style="color: var(--text-primary); font-weight: 500;">${escapeHtml(h.title)}</span>
                <span style="font-size: 11px; font-weight: 600; color: ${isDone ? '#10B981' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                  ${isDone ? '✓ Concluído' : '○ Pendente'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // MODO 2: SEMANA (7 DIAS)
  if (period === 'week') {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const doneCount = habits.filter(h => (h.completedDates || []).includes(dateStr)).length;
      const pct = Math.round((doneCount / totalHabits) * 100);
      days.push({
        label: weekdays[d.getDay()],
        dateStr,
        displayDate: `${dayNum}/${m}`,
        doneCount,
        pct,
        isToday: i === 0
      });
    }

    const svgWidth = 600;
    const svgHeight = 160;
    const barWidth = 44;
    const chartPad = 40;
    const availWidth = svgWidth - chartPad * 2;
    const step = availWidth / (days.length - 1);

    return `
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; min-height: 150px; display: block;" preserveAspectRatio="xMidYMid meet">
          <!-- Linhas guia de referência -->
          <line x1="30" y1="20" x2="${svgWidth - 20}" y2="20" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
          <text x="24" y="24" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">100%</text>

          <line x1="30" y1="70" x2="${svgWidth - 20}" y2="70" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
          <text x="24" y="74" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">50%</text>

          <line x1="30" y1="120" x2="${svgWidth - 20}" y2="120" stroke="currentColor" stroke-opacity="0.15"/>
          <text x="24" y="124" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">0%</text>

          <!-- Barras de cada dia -->
          ${days.map((d, idx) => {
            const cx = chartPad + idx * step;
            const barH = (d.pct / 100) * 100;
            const barY = 120 - barH;
            const color = d.pct === 100 ? '#10B981' : (d.pct > 0 ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)');

            return `
              <g class="chart-col-group">
                <!-- Barra de fundo -->
                <rect x="${cx - barWidth / 2}" y="20" width="${barWidth}" height="100" rx="4" fill="rgba(255, 255, 255, 0.03)" />
                
                <!-- Barra preenchida com tooltip -->
                <rect x="${cx - barWidth / 2}" y="${barY}" width="${barWidth}" height="${barH}" rx="4" fill="${color}">
                  <title>${d.label} (${d.displayDate}): ${d.doneCount} de ${totalHabits} hábitos concluídos (${d.pct}%)</title>
                </rect>

                <!-- Rótulo de % sobre a barra -->
                <text x="${cx}" y="${barY > 34 ? barY - 4 : 32}" fill="currentColor" fill-opacity="0.75" font-size="10" font-weight="600" text-anchor="middle">
                  ${d.pct}%
                </text>

                <!-- Rótulo do Eixo X -->
                <text x="${cx}" y="138" fill="${d.isToday ? 'var(--accent)' : 'currentColor'}" fill-opacity="${d.isToday ? '1' : '0.6'}" font-size="10.5" font-weight="${d.isToday ? '700' : '500'}" text-anchor="middle">
                  ${d.label}
                </text>
                <text x="${cx}" y="150" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="middle">
                  ${d.displayDate}
                </text>
              </g>
            `;
          }).join('')}
        </svg>
      </div>
    `;
  }

  // MODO 3: MÊS (ÚLTIMOS 30 DIAS)
  if (period === 'month') {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const doneCount = habits.filter(h => (h.completedDates || []).includes(dateStr)).length;
      const pct = Math.round((doneCount / totalHabits) * 100);
      days.push({
        dateStr,
        displayShort: `${dayNum}/${m}`,
        dayNum,
        doneCount,
        pct,
        isToday: i === 0
      });
    }

    const svgWidth = 640;
    const svgHeight = 150;
    const barWidth = 14;
    const padL = 35;
    const padR = 20;
    const availWidth = svgWidth - padL - padR;
    const step = availWidth / (days.length - 1);

    return `
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; min-height: 150px; display: block;" preserveAspectRatio="xMidYMid meet">
          <line x1="${padL}" y1="20" x2="${svgWidth - padR}" y2="20" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
          <text x="${padL - 6}" y="24" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">100%</text>

          <line x1="${padL}" y1="65" x2="${svgWidth - padR}" y2="65" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
          <text x="${padL - 6}" y="69" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">50%</text>

          <line x1="${padL}" y1="110" x2="${svgWidth - padR}" y2="110" stroke="currentColor" stroke-opacity="0.15"/>
          <text x="${padL - 6}" y="114" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">0%</text>

          ${days.map((d, idx) => {
            const cx = padL + idx * step;
            const barH = (d.pct / 100) * 90;
            const barY = 110 - barH;
            const color = d.pct === 100 ? '#10B981' : (d.pct > 0 ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)');
            const showLabel = idx % 5 === 0 || d.isToday;

            return `
              <g class="chart-month-col">
                <rect x="${cx - barWidth / 2}" y="20" width="${barWidth}" height="90" rx="2" fill="rgba(255, 255, 255, 0.02)" />
                <rect x="${cx - barWidth / 2}" y="${barY}" width="${barWidth}" height="${barH}" rx="2" fill="${color}">
                  <title>${d.displayShort}: ${d.doneCount} de ${totalHabits} hábitos concluídos (${d.pct}%)</title>
                </rect>

                ${showLabel ? `
                  <text x="${cx}" y="128" fill="${d.isToday ? 'var(--accent)' : 'currentColor'}" fill-opacity="${d.isToday ? '1' : '0.5'}" font-size="9" font-weight="${d.isToday ? '700' : 'normal'}" text-anchor="middle">
                    ${d.dayNum}
                  </text>
                ` : ''}
              </g>
            `;
          }).join('')}
        </svg>
      </div>
    `;
  }

  // MODO 4: ANO (12 MESES)
  if (period === 'year') {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = today.getFullYear();
    const currentMonthIdx = today.getMonth();

    const monthStats = months.map((mName, mIdx) => {
      const daysInMonth = new Date(currentYear, mIdx + 1, 0).getDate();
      const mPad = String(mIdx + 1).padStart(2, '0');
      let totalCompletions = 0;
      let daysCount = mIdx <= currentMonthIdx ? (mIdx === currentMonthIdx ? today.getDate() : daysInMonth) : 0;

      for (let day = 1; day <= daysCount; day++) {
        const dPad = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${mPad}-${dPad}`;
        habits.forEach(h => {
          if ((h.completedDates || []).includes(dateStr)) {
            totalCompletions++;
          }
        });
      }

      const possible = daysCount * totalHabits;
      const pct = possible > 0 ? Math.round((totalCompletions / possible) * 100) : 0;

      return {
        name: mName,
        pct,
        totalCompletions,
        isFuture: mIdx > currentMonthIdx,
        isCurrent: mIdx === currentMonthIdx
      };
    });

    const svgWidth = 600;
    const svgHeight = 150;
    const barWidth = 30;
    const padL = 35;
    const padR = 20;
    const availWidth = svgWidth - padL - padR;
    const step = availWidth / (monthStats.length - 1);

    return `
      <div style="width: 100%; overflow-x: auto;">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; min-height: 150px; display: block;" preserveAspectRatio="xMidYMid meet">
          <line x1="${padL}" y1="20" x2="${svgWidth - padR}" y2="20" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
          <text x="${padL - 6}" y="24" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">100%</text>

          <line x1="${padL}" y1="65" x2="${svgWidth - padR}" y2="65" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
          <text x="${padL - 6}" y="69" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">50%</text>

          <line x1="${padL}" y1="110" x2="${svgWidth - padR}" y2="110" stroke="currentColor" stroke-opacity="0.15"/>
          <text x="${padL - 6}" y="114" fill="currentColor" fill-opacity="0.4" font-size="9" text-anchor="end">0%</text>

          ${monthStats.map((m, idx) => {
            const cx = padL + idx * step;
            const barH = (m.pct / 100) * 90;
            const barY = 110 - barH;
            const color = m.isFuture ? 'rgba(255, 255, 255, 0.03)' : (m.pct > 50 ? '#10B981' : (m.pct > 0 ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)'));

            return `
              <g class="chart-year-col">
                <rect x="${cx - barWidth / 2}" y="20" width="${barWidth}" height="90" rx="3" fill="rgba(255, 255, 255, 0.02)" />
                <rect x="${cx - barWidth / 2}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="${color}">
                  <title>${m.name}/${currentYear}: Consistência de ${m.pct}% (${m.totalCompletions} hábitos concluídos)</title>
                </rect>

                ${!m.isFuture && m.pct > 0 ? `
                  <text x="${cx}" y="${barY - 4}" fill="currentColor" fill-opacity="0.75" font-size="9" font-weight="600" text-anchor="middle">
                    ${m.pct}%
                  </text>
                ` : ''}

                <text x="${cx}" y="128" fill="${m.isCurrent ? 'var(--accent)' : 'currentColor'}" fill-opacity="${m.isCurrent ? '1' : (m.isFuture ? '0.3' : '0.6')}" font-size="9.5" font-weight="${m.isCurrent ? '700' : 'normal'}" text-anchor="middle">
                  ${m.name}
                </text>
              </g>
            `;
          }).join('')}
        </svg>
      </div>
    `;
  }

  return '';
}

export function renderHabits(container) {
  container.innerHTML = '';

  const data = StorageService.getData();
  const habits = data.habits || [];
  const todayStr = getTodayDateString();

  // Garante que a data selecionada de histórico seja válida e não posterior a hoje
  if (!selectedHistoryDate || selectedHistoryDate > todayStr) {
    selectedHistoryDate = todayStr;
  }

  // 1. Cálculos de indicadores
  const completedTodayList = habits.filter(h => (h.completedDates || []).includes(todayStr));
  const pendingTodayList = habits.filter(h => !(h.completedDates || []).includes(todayStr));
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => calculateStreak(h.completedDates)), 0) : 0;
  const periodMetrics = calculatePeriodMetrics(habits, activePeriodFilter, todayStr);

  // 2. Dados dos últimos 30 dias para o histórico visual
  const last30Days = getLast30DaysList(todayStr);

  // 3. Validação da data selecionada para marcação retroativa
  const isSelectedDateEditable = isDateWithin30DaysWindow(selectedHistoryDate, todayStr);
  const selectedDateCompletions = habits.filter(h => (h.completedDates || []).includes(selectedHistoryDate)).length;
  const selectedDatePct = habits.length > 0 ? Math.round((selectedDateCompletions / habits.length) * 100) : 0;

  const habitsEl = document.createElement('div');
  habitsEl.className = 'habits-view';
  habitsEl.id = 'view-habits';

  habitsEl.innerHTML = `
    <!-- INDICADORES RESUMO DO TOPO -->
    <div class="habits-analytics-grid">
      <div class="habits-metric-card">
        <div class="metric-card-header">
          <span class="metric-label">Concluídos Hoje</span>
          <span class="metric-icon-box" style="background: rgba(16, 185, 129, 0.12); color: #34D399;">✓</span>
        </div>
        <div class="metric-value ${completedTodayList.length === habits.length && habits.length > 0 ? 'positive' : ''}">
          ${completedTodayList.length} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">/ ${habits.length}</span>
        </div>
        <div class="metric-subtext">
          ${habits.length === 0 ? 'Nenhum hábito' : (pendingTodayList.length === 0 ? '100% cumpridos hoje!' : `${pendingTodayList.length} restante(s)`)}
        </div>
      </div>

      <div class="habits-metric-card">
        <div class="metric-card-header">
          <span class="metric-label">Maior Sequência Ativa</span>
          <span class="metric-icon-box" style="background: rgba(255, 90, 31, 0.12); color: var(--accent);">${getIcon('flame')}</span>
        </div>
        <div class="metric-value" style="color: var(--accent);">
          ${maxStreak} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">${maxStreak === 1 ? 'dia' : 'dias'}</span>
        </div>
        <div class="metric-subtext">Consistência ininterrupta</div>
      </div>

      <div class="habits-metric-card">
        <div class="metric-card-header">
          <span class="metric-label">Taxa no Período</span>
          <span class="metric-icon-box" style="background: rgba(59, 130, 246, 0.12); color: #60A5FA;">%</span>
        </div>
        <div class="metric-value ${periodMetrics.rate >= 70 ? 'positive' : ''}">
          ${periodMetrics.rate}%
        </div>
        <div class="metric-subtext">${periodMetrics.completedCount} conclusões registradas</div>
      </div>

      <div class="habits-metric-card">
        <div class="metric-card-header">
          <span class="metric-label">Total de Hábitos</span>
          <span class="metric-icon-box" style="background: rgba(255, 255, 255, 0.05); color: var(--text-secondary);">${getIcon('habits')}</span>
        </div>
        <div class="metric-value">
          ${habits.length}
        </div>
        <div class="metric-subtext">Rotinas diárias ativas</div>
      </div>
    </div>

    <!-- SEÇÃO 1: GRÁFICO DE DESEMPENHO COM SELETOR DE PERÍODO -->
    <div class="habits-chart-card">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            ${getIcon('flame')} Gráfico de Desempenho
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
            Acompanhe a sua evolução e regularidade diária
          </div>
        </div>

        <!-- Seletor de Período (Pills) -->
        <div class="finance-pills-selector" style="margin-bottom: 0;">
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'day' ? 'active' : ''}" data-period="day">
            Dia
          </button>
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'week' ? 'active' : ''}" data-period="week">
            Semana
          </button>
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'month' ? 'active' : ''}" data-period="month">
            Mês
          </button>
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'year' ? 'active' : ''}" data-period="year">
            Ano
          </button>
        </div>
      </div>

      <!-- Renderização do Gráfico SVG -->
      ${renderPerformanceChart(habits, activePeriodFilter, todayStr)}
    </div>

    <!-- SEÇÃO 2: HISTÓRICO VISUAL DOS ÚLTIMOS 30 DIAS & MARCAÇÃO RETROATIVA -->
    <div class="habits-history-card">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            ${getIcon('agenda')} Histórico Visual & Marcação Retroativa
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
            Consulte o status e ajuste conclusões nos últimos 30 dias (limite estrito)
          </div>
        </div>

        <div style="font-size: 11px; padding: 4px 8px; border-radius: 4px; background: rgba(255, 90, 31, 0.1); color: var(--accent); font-weight: 500;">
          Janela de edição: 30 dias
        </div>
      </div>

      <!-- Carrossel / Faixa de Seleção dos Últimos 30 Dias -->
      <div class="habits-days-carousel" id="habits-days-carousel">
        ${last30Days.map(d => {
          const isSelected = d.dateStr === selectedHistoryDate;
          const done = habits.filter(h => (h.completedDates || []).includes(d.dateStr)).length;
          let badgeClass = 'none';
          if (habits.length > 0 && done === habits.length) badgeClass = 'all-done';
          else if (done > 0) badgeClass = 'partial';

          return `
            <div 
              class="habits-day-chip ${isSelected ? 'active' : ''} ${d.isToday ? 'is-today' : ''}" 
              data-date="${d.dateStr}"
              title="${formatDateBR(d.dateStr)}: ${done} de ${habits.length} concluídos"
            >
              <span class="habits-day-chip-weekday">${d.isToday ? 'Hoje' : (d.isYesterday ? 'Ontem' : d.weekday)}</span>
              <span class="habits-day-chip-num">${d.dayNum}</span>
              <span class="habits-day-chip-badge ${badgeClass}">${done}/${habits.length}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Painel de Inspeção e Marcação Retroativa da Data Selecionada -->
      <div class="habits-retro-panel">
        <div class="retro-panel-header">
          <div>
            <div class="retro-panel-date">
              <span>📅 Data selecionada: ${formatDateBR(selectedHistoryDate)}</span>
              ${selectedHistoryDate === todayStr ? '<span style="font-size: 11px; color: var(--accent); font-weight: bold;">(Hoje)</span>' : ''}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">
              ${selectedDateCompletions} de ${habits.length} hábitos concluídos nesta data (${selectedDatePct}%)
            </div>
          </div>

          <div>
            ${isSelectedDateEditable ? `
              <span class="retro-panel-badge" style="color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);">
                ✓ Edição retroativa permitida
              </span>
            ` : `
              <span class="retro-panel-badge" style="color: var(--text-muted); border: 1px solid var(--border-color);">
                🔒 Data bloqueada (fora da janela de 30 dias)
              </span>
            `}
          </div>
        </div>

        ${habits.length === 0 ? `
          <div style="padding: 16px 0; text-align: center; color: var(--text-muted); font-size: 12px;">
            Nenhum hábito cadastrado para gerenciar nesta data.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${habits.map(h => {
              const completedDates = Array.isArray(h.completedDates) ? h.completedDates : [];
              const isDoneOnDate = completedDates.includes(selectedHistoryDate);

              return `
                <div class="retro-habit-row">
                  <div class="retro-habit-name">
                    ${escapeHtml(h.title)}
                  </div>

                  <button
                    type="button"
                    class="retro-toggle-btn ${isDoneOnDate ? 'done' : ''}"
                    data-habit-id="${h.id}"
                    data-target-date="${selectedHistoryDate}"
                    ${!isSelectedDateEditable ? 'disabled title="Alterações permitidas apenas nos últimos 30 dias e até hoje."' : ''}
                  >
                    ${isDoneOnDate ? `${getIcon('check')} Concluído nesta data` : '○ Marcar como concluído'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>

    <!-- SEÇÃO 3: FORMULÁRIO DE CRIAÇÃO & GERENCIAMENTO DE HÁBITOS DE HOJE -->
    <div class="card" style="margin-top: 4px;">
      <div class="card-header-clean" style="margin-bottom: 12px;">
        <h3>Gerenciar Hábitos</h3>
        <span class="text-muted-xs">${habits.length} cadastrados</span>
      </div>

      <!-- Formulário de Criação -->
      <form class="quick-form" id="form-new-habit" style="margin-bottom: 16px;">
        <input
          type="text"
          id="input-habit-title"
          placeholder="Nome do novo hábito (ex: Beber 2L de água, Alongamento...)"
          autocomplete="off"
          required
        />
        <button type="submit" class="btn btn-primary" id="btn-add-habit">
          ${getIcon('plus')} Criar Hábito
        </button>
      </form>

      <!-- Lista de Hábitos -->
      ${habits.length === 0 ? `
        <div class="empty-state-box">
          <div class="empty-state-icon">
            ${getIcon('habits')}
          </div>
          <h4 class="empty-state-title">Nenhum hábito cadastrado</h4>
          <p class="empty-state-desc">Construa rotinas consistentes criando seu primeiro hábito diário no campo acima.</p>
        </div>
      ` : `
        <div class="item-list" id="habits-list">
          ${habits.map(h => {
            const completedDates = Array.isArray(h.completedDates) ? h.completedDates : [];
            const isDoneToday = completedDates.includes(todayStr);
            const streak = calculateStreak(completedDates);
            const last7Days = getLast7Days(completedDates);

            return `
              <div class="habit-item ${isDoneToday ? 'is-done' : ''}" data-id="${h.id}" id="habit-item-${h.id}">
                <div class="habit-left">
                  <span class="habit-name">${escapeHtml(h.title)}</span>
                  
                  <div class="habit-meta-row">
                    <span class="habit-streak-badge" title="Sequência consecutiva de dias">
                      ${getIcon('flame')} ${streak} ${streak === 1 ? 'dia' : 'dias'}
                    </span>

                    <!-- Mini Histórico dos Últimos 7 Dias -->
                    <div class="habit-week-dots" title="Histórico dos últimos 7 dias">
                      ${last7Days.map(day => `
                        <span 
                          class="habit-day-dot ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}" 
                          title="${day.label} (${day.dateStr}): ${day.completed ? 'Concluído' : 'Não realizado'}"
                        >
                          ${day.label[0]}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                </div>

                <div class="habit-actions">
                  <button
                    type="button"
                    class="btn-habit-check ${isDoneToday ? 'done' : ''} habit-toggle-btn"
                    data-id="${h.id}"
                    title="${isDoneToday ? 'Desmarcar hábito de hoje' : 'Marcar hábito como concluído hoje'}"
                  >
                    ${isDoneToday ? `${getIcon('check')} Concluído hoje` : '○ Marcar hoje'}
                  </button>

                  <button 
                    type="button" 
                    class="btn-icon-subtle habit-edit-btn" 
                    data-id="${h.id}" 
                    title="Editar nome do hábito"
                  >
                    ${getIcon('edit')}
                  </button>

                  <button 
                    type="button" 
                    class="btn-danger-subtle habit-delete-btn" 
                    data-id="${h.id}" 
                    title="Excluir hábito"
                  >
                    ${getIcon('trash')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  container.appendChild(habitsEl);

  // 1. Ouvintes do Seletor de Período do Gráfico (Dia, Semana, Mês, Ano)
  habitsEl.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      activePeriodFilter = btn.getAttribute('data-period');
      renderHabits(container);
    });
  });

  // 2. Ouvintes dos Chips dos Últimos 30 Dias no Carrossel
  habitsEl.querySelectorAll('.habits-day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const date = chip.getAttribute('data-date');
      if (date) {
        selectedHistoryDate = date;
        renderHabits(container);
      }
    });
  });

  // 3. Ouvintes de Marcação Retroativa (estritamente nos últimos 30 dias)
  habitsEl.querySelectorAll('.retro-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.getAttribute('data-habit-id');
      const targetDate = btn.getAttribute('data-target-date');

      // Validação estrita do limite de 30 dias e impedimento de datas futuras
      if (!isDateWithin30DaysWindow(targetDate, todayStr)) {
        showToast('Não é permitido alterar datas anteriores a 30 dias ou datas futuras.', 'error');
        return;
      }

      const currentHabits = StorageService.getData().habits || [];
      let toggledState = false;

      const updated = currentHabits.map(h => {
        if (h.id === habitId) {
          const dates = Array.isArray(h.completedDates) ? [...h.completedDates] : [];
          const idx = dates.indexOf(targetDate);

          if (idx >= 0) {
            dates.splice(idx, 1);
            toggledState = false;
          } else {
            dates.push(targetDate);
            toggledState = true;
          }

          // Recálculo da sequência consecutiva sem quebrar regras
          const streak = calculateStreak(dates);

          return {
            ...h,
            completedDates: dates,
            streak: streak
          };
        }
        return h;
      });

      await StorageService.updateSection('habits', updated);
      showToast(
        toggledState 
          ? `Hábito marcado para ${formatDateBR(targetDate)}` 
          : `Hábito desmarcado para ${formatDateBR(targetDate)}`, 
        'success'
      );
      renderHabits(container);
    });
  });

  // 4. Submissão do formulário de novo hábito
  const inputEl = habitsEl.querySelector('#input-habit-title');
  const form = habitsEl.querySelector('#form-new-habit');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = inputEl?.value.trim();
    if (!title) return;

    const newHabit = {
      id: generateId('habit'),
      title: title,
      streak: 0,
      completedDates: [],
      createdAt: new Date().toISOString()
    };

    const currentHabits = StorageService.getData().habits || [];
    await StorageService.updateSection('habits', [...currentHabits, newHabit]);
    showToast('Hábito criado com sucesso!', 'success');
    renderHabits(container);
  });

  // 5. Alternar conclusão de hoje na lista principal
  habitsEl.querySelectorAll('.habit-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentHabits = StorageService.getData().habits || [];

      const updated = currentHabits.map(h => {
        if (h.id === id) {
          const dates = Array.isArray(h.completedDates) ? [...h.completedDates] : [];
          const index = dates.indexOf(todayStr);

          if (index >= 0) {
            dates.splice(index, 1);
          } else {
            dates.push(todayStr);
          }

          const streak = calculateStreak(dates);

          return {
            ...h,
            completedDates: dates,
            streak: streak
          };
        }
        return h;
      });

      await StorageService.updateSection('habits', updated);
      renderHabits(container);
    });
  });

  // 6. Editar hábito (Modal Padronizado)
  habitsEl.querySelectorAll('.habit-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const currentHabits = StorageService.getData().habits || [];
      const habit = currentHabits.find(h => h.id === id);
      if (!habit) return;

      openModal({
        title: 'Editar Hábito',
        contentHtml: `
          <div class="modal-field">
            <label class="modal-label" for="edit-habit-input-title">Nome do Hábito</label>
            <input 
              type="text" 
              id="edit-habit-input-title" 
              value="${escapeHtml(habit.title)}" 
              placeholder="Digite o nome do hábito..."
              autocomplete="off"
            />
          </div>
        `,
        confirmText: 'Salvar Alterações',
        onConfirm: async ({ dialog, setError }) => {
          const newTitleInput = dialog.querySelector('#edit-habit-input-title');
          const newTitle = newTitleInput ? newTitleInput.value.trim() : '';

          if (!newTitle) {
            setError('O nome do hábito não pode ficar vazio.');
            return false;
          }

          const updated = currentHabits.map(h => {
            if (h.id === id) {
              return { ...h, title: newTitle };
            }
            return h;
          });

          await StorageService.updateSection('habits', updated);
          showToast('Hábito atualizado com sucesso!', 'success');
          renderHabits(container);
          return true;
        }
      });
    });
  });

  // 7. Excluir hábito
  habitsEl.querySelectorAll('.habit-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentHabits = StorageService.getData().habits || [];
      const updated = currentHabits.filter(h => h.id !== id);
      await StorageService.updateSection('habits', updated);
      showToast('Hábito excluído com sucesso!', 'success');
      renderHabits(container);
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
