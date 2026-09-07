/**
 * Módulo Finanças — Gestão Financeira Pessoal & Profissional
 * Indicadores, Análise Visual (Entradas x Saídas, Evolução, Categorias)
 * Filtros temporais (Semana, Mês, Ano, Todos) e sincronização contínua com StorageService / db.json
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';
import { getTodayDateString } from '../utils/dateUtils.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let activePeriodFilter = 'month'; // 'week' | 'month' | 'year' | 'all'
let activeTypeFilter = 'all';     // 'all' | 'income' | 'expense'

const categoryColors = {
  'Alimentação': '#F59E0B',
  'Moradia': '#3B82F6',
  'Transporte': '#8B5CF6',
  'Saúde': '#EC4899',
  'Lazer': '#10B981',
  'Educação': '#06B6D4',
  'Salário': '#10B981',
  'Investimentos': '#6366F1',
  'Geral': '#9CA3AF',
  'Outros': '#6B7280'
};

/**
 * Retorna os limites de data e rótulo para o filtro de período
 */
function getPeriodBounds(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  if (period === 'week') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    const py = past7.getFullYear();
    const pm = String(past7.getMonth() + 1).padStart(2, '0');
    const pd = String(past7.getDate()).padStart(2, '0');
    return {
      startDate: `${py}-${pm}-${pd}`,
      endDate: todayStr,
      label: 'Últimos 7 dias',
      rangeText: `${pd}/${pm}/${py} a ${d}/${m}/${y}`
    };
  }

  if (period === 'month') {
    const lastDayOfMonth = new Date(y, now.getMonth() + 1, 0).getDate();
    const lastDayPad = String(lastDayOfMonth).padStart(2, '0');
    return {
      startDate: `${y}-${m}-01`,
      endDate: `${y}-${m}-${lastDayPad}`,
      label: 'Este Mês',
      rangeText: `01/${m}/${y} a ${lastDayPad}/${m}/${y}`
    };
  }

  if (period === 'year') {
    return {
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      label: `Ano de ${y}`,
      rangeText: `01/01/${y} a 31/12/${y}`
    };
  }

  // 'all'
  return {
    startDate: '',
    endDate: '',
    label: 'Todo o Histórico',
    rangeText: 'Todas as movimentações registradas'
  };
}

/**
 * Gera pontos de dados temporais para o gráfico de evolução financeira
 */
function generateEvolutionPoints(period, transactions, bounds) {
  const points = [];

  if (period === 'week') {
    const [sy, sm, sd] = bounds.startDate.split('-').map(Number);
    const startDateObj = new Date(sy, sm - 1, sd);
    for (let i = 0; i < 7; i++) {
      const cur = new Date(startDateObj);
      cur.setDate(cur.getDate() + i);
      const cy = cur.getFullYear();
      const cm = String(cur.getMonth() + 1).padStart(2, '0');
      const cd = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${cy}-${cm}-${cd}`;
      const dayTxs = transactions.filter(t => t.date === dateStr);
      let inc = 0;
      let exp = 0;
      dayTxs.forEach(t => {
        const val = parseFloat(t.amount) || 0;
        if (t.type === 'income') inc += val;
        else exp += val;
      });
      points.push({
        label: `${cd}/${cm}`,
        income: inc,
        expense: exp
      });
    }
  } else if (period === 'month') {
    const [yStr, mStr] = bounds.startDate.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const daysInMonth = new Date(y, m, 0).getDate();

    const blocks = [
      { start: 1, end: 7, label: `01-07/${mStr}` },
      { start: 8, end: 14, label: `08-14/${mStr}` },
      { start: 15, end: 21, label: `15-21/${mStr}` },
      { start: 22, end: 28, label: `22-28/${mStr}` },
      { start: 29, end: daysInMonth, label: `29-${daysInMonth}/${mStr}` }
    ];

    blocks.forEach(blk => {
      let inc = 0;
      let exp = 0;
      transactions.forEach(t => {
        if (!t.date || !t.date.startsWith(`${yStr}-${mStr}`)) return;
        const day = parseInt(t.date.split('-')[2], 10);
        if (day >= blk.start && day <= blk.end) {
          const val = parseFloat(t.amount) || 0;
          if (t.type === 'income') inc += val;
          else exp += val;
        }
      });
      points.push({
        label: blk.label,
        income: inc,
        expense: exp
      });
    });
  } else if (period === 'year') {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const yStr = bounds.startDate.split('-')[0];
    months.forEach((mName, idx) => {
      const mPad = String(idx + 1).padStart(2, '0');
      let inc = 0;
      let exp = 0;
      transactions.forEach(t => {
        if (t.date && t.date.startsWith(`${yStr}-${mPad}`)) {
          const val = parseFloat(t.amount) || 0;
          if (t.type === 'income') inc += val;
          else exp += val;
        }
      });
      points.push({
        label: mName,
        income: inc,
        expense: exp
      });
    });
  } else {
    // 'all'
    const monthMap = {};
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const ym = t.date.substring(0, 7);
        if (!monthMap[ym]) monthMap[ym] = { income: 0, expense: 0 };
        const val = parseFloat(t.amount) || 0;
        if (t.type === 'income') monthMap[ym].income += val;
        else monthMap[ym].expense += val;
      }
    });
    const keys = Object.keys(monthMap).sort();
    if (keys.length === 0) {
      points.push({ label: 'Geral', income: 0, expense: 0 });
    } else {
      keys.forEach(ym => {
        const [y, m] = ym.split('-');
        points.push({
          label: `${m}/${y.slice(2)}`,
          income: monthMap[ym].income,
          expense: monthMap[ym].expense
        });
      });
    }
  }

  return points;
}

/**
 * Renderiza gráfico de evolução temporal em SVG puro
 */
function renderEvolutionSvg(points) {
  const width = 640;
  const height = 170;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 30;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxVal = Math.max(...points.map(p => Math.max(p.income, p.expense)), 100);
  const n = points.length;

  const getX = (idx) => padLeft + (n > 1 ? (idx / (n - 1)) * innerW : innerW / 2);
  const getY = (val) => padTop + innerH - (maxVal > 0 ? (val / maxVal) * innerH : 0);

  const incomeCoords = points.map((p, i) => `${getX(i)},${getY(p.income)}`);
  const expenseCoords = points.map((p, i) => `${getX(i)},${getY(p.expense)}`);

  const incomePath = `M ${incomeCoords.join(' L ')}`;
  const expensePath = `M ${expenseCoords.join(' L ')}`;

  const incomeArea = `${incomePath} L ${getX(n - 1)},${padTop + innerH} L ${getX(0)},${padTop + innerH} Z`;
  const expenseArea = `${expensePath} L ${getX(n - 1)},${padTop + innerH} L ${getX(0)},${padTop + innerH} Z`;

  const y0 = padTop + innerH;
  const y50 = padTop + innerH / 2;
  const y100 = padTop;

  const formatShort = (v) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return Math.round(v).toString();
  };

  return `
    <svg class="evolution-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="finIncomeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="finExpenseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#EF4444" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#EF4444" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Linhas de grade e valores no eixo Y -->
      <line x1="${padLeft}" y1="${y100}" x2="${width - padRight}" y2="${y100}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
      <text x="${padLeft - 6}" y="${y100 + 4}" fill="currentColor" fill-opacity="0.4" font-size="10" text-anchor="end">R$ ${formatShort(maxVal)}</text>

      <line x1="${padLeft}" y1="${y50}" x2="${width - padRight}" y2="${y50}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
      <text x="${padLeft - 6}" y="${y50 + 4}" fill="currentColor" fill-opacity="0.4" font-size="10" text-anchor="end">R$ ${formatShort(maxVal / 2)}</text>

      <line x1="${padLeft}" y1="${y0}" x2="${width - padRight}" y2="${y0}" stroke="currentColor" stroke-opacity="0.15"/>
      <text x="${padLeft - 6}" y="${y0 + 4}" fill="currentColor" fill-opacity="0.4" font-size="10" text-anchor="end">R$ 0</text>

      <!-- Áreas preenchidas -->
      <path d="${incomeArea}" fill="url(#finIncomeGrad)"/>
      <path d="${expenseArea}" fill="url(#finExpenseGrad)"/>

      <!-- Linhas principais -->
      <path d="${incomePath}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${expensePath}" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Pontos e Eixo X -->
      ${points.map((p, i) => {
        const cx = getX(i);
        const cyInc = getY(p.income);
        const cyExp = getY(p.expense);
        return `
          <g class="chart-point-group">
            <text x="${cx}" y="${padTop + innerH + 18}" fill="currentColor" fill-opacity="0.5" font-size="10" text-anchor="middle">
              ${p.label}
            </text>

            <circle cx="${cx}" cy="${cyInc}" r="4" fill="#10B981" stroke="#1E1E22" stroke-width="1.5">
              <title>${p.label} • Receitas: R$ ${p.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</title>
            </circle>

            <circle cx="${cx}" cy="${cyExp}" r="4" fill="#EF4444" stroke="#1E1E22" stroke-width="1.5">
              <title>${p.label} • Despesas: R$ ${p.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</title>
            </circle>
          </g>
        `;
      }).join('')}
    </svg>
  `;
}

/**
 * Renderiza o gráfico de Entradas x Saídas
 */
function renderIncomeVsExpense(totalIncome, totalExpense) {
  const totalFlow = totalIncome + totalExpense;
  const incomePct = totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 0;
  const expensePct = totalFlow > 0 ? (totalExpense / totalFlow) * 100 : 0;
  const balance = totalIncome - totalExpense;

  return `
    <div class="finance-bars-compare">
      <div class="compare-bar-item">
        <div class="compare-bar-meta">
          <span style="color: #10B981; display: flex; align-items: center; gap: 4px;">
            <span class="legend-dot" style="background: #10B981;"></span> Entradas
          </span>
          <span style="color: #10B981;">
            + R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${incomePct.toFixed(1)}%)
          </span>
        </div>
        <div class="compare-bar-track">
          <div class="compare-bar-fill income" style="width: ${incomePct.toFixed(1)}%;"></div>
        </div>
      </div>

      <div class="compare-bar-item">
        <div class="compare-bar-meta">
          <span style="color: #EF4444; display: flex; align-items: center; gap: 4px;">
            <span class="legend-dot" style="background: #EF4444;"></span> Saídas
          </span>
          <span style="color: #EF4444;">
            - R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${expensePct.toFixed(1)}%)
          </span>
        </div>
        <div class="compare-bar-track">
          <div class="compare-bar-fill expense" style="width: ${expensePct.toFixed(1)}%;"></div>
        </div>
      </div>

      <div style="margin-top: 6px; padding: 8px 10px; background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11.5px; color: var(--text-muted);">Balanço do Período:</span>
        <span style="font-size: 13px; font-weight: 700; color: ${balance >= 0 ? '#10B981' : '#EF4444'};">
          ${balance >= 0 ? '+ ' : '- '}R$ ${Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          <span style="font-size: 10px; font-weight: normal; margin-left: 4px; padding: 2px 6px; border-radius: 4px; background: ${balance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};">
            ${balance >= 0 ? 'Superávit' : 'Déficit'}
          </span>
        </span>
      </div>
    </div>
  `;
}

/**
 * Renderiza a distribuição de despesas por categorias existentes
 */
function renderCategoryBreakdown(periodTransactions) {
  const expenseTxs = periodTransactions.filter(t => t.type === 'expense');
  const catTotals = {};
  let totalExpense = 0;

  expenseTxs.forEach(t => {
    const cat = t.category || 'Geral';
    const val = parseFloat(t.amount) || 0;
    catTotals[cat] = (catTotals[cat] || 0) + val;
    totalExpense += val;
  });

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  if (sortedCats.length === 0) {
    return `
      <div style="padding: 24px 0; text-align: center; color: var(--text-muted); font-size: 12px;">
        Nenhuma despesa registrada neste período.
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 4px;">
      ${sortedCats.map(([cat, amount]) => {
        const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
        const color = categoryColors[cat] || '#FF5A1F';
        return `
          <div class="category-bar-item">
            <div class="category-bar-header">
              <span class="category-name" style="display: flex; align-items: center; gap: 6px;">
                <span class="legend-dot" style="background: ${color};"></span>
                ${escapeHtml(cat)}
              </span>
              <span class="category-amount">
                R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span style="font-size: 10.5px; color: var(--text-muted); margin-left: 4px;">(${pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div class="category-bar-track">
              <div class="category-bar-fill" style="width: ${pct.toFixed(1)}%; background: ${color};"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function renderFinances(container) {
  const data = StorageService.getData();
  const allTransactions = (data.finances?.transactions || []).slice().sort((a, b) => {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  // 1. Filtragem por Período
  const bounds = getPeriodBounds(activePeriodFilter);
  const periodTransactions = allTransactions.filter(t => {
    if (!bounds.startDate || !bounds.endDate) return true;
    return t.date >= bounds.startDate && t.date <= bounds.endDate;
  });

  // 2. Cálculos do Período Selecionado
  let totalIncome = 0;
  let totalExpense = 0;
  periodTransactions.forEach(t => {
    const val = parseFloat(t.amount) || 0;
    if (t.type === 'income') totalIncome += val;
    else totalExpense += val;
  });
  const balance = totalIncome - totalExpense;
  const incomeCount = periodTransactions.filter(t => t.type === 'income').length;
  const expenseCount = periodTransactions.filter(t => t.type === 'expense').length;

  // 3. Filtragem de exibição da lista por tipo (Todos / Receitas / Despesas)
  const filteredList = periodTransactions.filter(t => {
    if (activeTypeFilter === 'income') return t.type === 'income';
    if (activeTypeFilter === 'expense') return t.type === 'expense';
    return true;
  });

  // Pontos da evolução
  const evolutionPoints = generateEvolutionPoints(activePeriodFilter, periodTransactions, bounds);

  container.innerHTML = `
    <div class="finances-layout">
      <!-- BARRA SUPERIOR DE CONTROLE DE PERÍODO -->
      <div class="finances-toolbar" style="flex-wrap: wrap; gap: 12px; margin-bottom: -4px;">
        <div>
          <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            ${getIcon('finances')} Análise Financeira
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Intervalo: <span style="color: var(--text-secondary); font-weight: 500;">${bounds.rangeText}</span>
          </div>
        </div>

        <!-- Seletor de Período (Pills Nodus) -->
        <div class="finance-pills-selector" style="margin-bottom: 0;">
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'week' ? 'active' : ''}" data-period="week">
            Semana
          </button>
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'month' ? 'active' : ''}" data-period="month">
            Mês
          </button>
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'year' ? 'active' : ''}" data-period="year">
            Ano
          </button>
          <button type="button" class="fin-pill-btn ${activePeriodFilter === 'all' ? 'active' : ''}" data-period="all">
            Todos
          </button>
        </div>
      </div>

      <!-- MÉTRICAS RESUMO DO PERÍODO -->
      <div class="finances-metrics-grid">
        <div class="finance-metric-card balance-card">
          <div class="metric-card-header">
            <span class="metric-label">Saldo do Período</span>
            <span class="metric-icon-box balance">${getIcon('finances')}</span>
          </div>
          <div class="metric-value ${balance >= 0 ? 'positive' : 'negative'}">
            R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div class="metric-subtext">${bounds.label} (${periodTransactions.length} transações)</div>
        </div>

        <div class="finance-metric-card income-card">
          <div class="metric-card-header">
            <span class="metric-label">Total de Entradas</span>
            <span class="metric-icon-box income">↑</span>
          </div>
          <div class="metric-value positive">
            + R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div class="metric-subtext">${incomeCount} receitas no período</div>
        </div>

        <div class="finance-metric-card expense-card">
          <div class="metric-card-header">
            <span class="metric-label">Total de Saídas</span>
            <span class="metric-icon-box expense">↓</span>
          </div>
          <div class="metric-value negative">
            - R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div class="metric-subtext">${expenseCount} despesas no período</div>
        </div>
      </div>

      <!-- ÁREA DE GRÁFICOS VISUAIS -->
      <div class="finances-charts-grid">
        <!-- Gráfico 1: Entradas x Saídas -->
        <div class="finance-chart-card">
          <div class="finance-chart-header">
            <div class="finance-chart-title">
              <span>Balanço de Fluxo</span>
            </div>
            <span class="finance-chart-subtitle">${bounds.label}</span>
          </div>
          ${renderIncomeVsExpense(totalIncome, totalExpense)}
        </div>

        <!-- Gráfico 2: Gastos por Categoria -->
        <div class="finance-chart-card">
          <div class="finance-chart-header">
            <div class="finance-chart-title">
              <span>Gastos por Categoria</span>
            </div>
            <span class="finance-chart-subtitle">${expenseCount} lançamentos</span>
          </div>
          ${renderCategoryBreakdown(periodTransactions)}
        </div>
      </div>

      <!-- Gráfico 3: Evolução Financeira Temporal -->
      <div class="finance-chart-card">
        <div class="finance-chart-header">
          <div>
            <div class="finance-chart-title">
              <span>Evolução Financeira</span>
            </div>
            <span class="finance-chart-subtitle">Histórico comparativo de receitas e despesas ao longo de ${bounds.label.toLowerCase()}</span>
          </div>

          <div class="chart-legend">
            <span style="display: flex; align-items: center;">
              <span class="legend-dot" style="background: #10B981;"></span> Entradas
            </span>
            <span style="display: flex; align-items: center;">
              <span class="legend-dot" style="background: #EF4444;"></span> Saídas
            </span>
          </div>
        </div>

        <div class="evolution-svg-container">
          ${periodTransactions.length === 0 ? `
            <div style="padding: 36px 0; text-align: center; color: var(--text-muted); font-size: 12px;">
              Nenhuma movimentação para exibir no período selecionado.
            </div>
          ` : renderEvolutionSvg(evolutionPoints)}
        </div>
      </div>

      <!-- BARRA DE FERRAMENTAS DO HISTÓRICO DE TRANSAÇÕES -->
      <div class="finances-toolbar" style="margin-top: 8px;">
        <div class="finance-pills-selector" style="margin-bottom: 0;">
          <button type="button" class="fin-pill-btn ${activeTypeFilter === 'all' ? 'active' : ''}" data-filter="all">
            Todos (${periodTransactions.length})
          </button>
          <button type="button" class="fin-pill-btn ${activeTypeFilter === 'income' ? 'active' : ''}" data-filter="income">
            Receitas (${incomeCount})
          </button>
          <button type="button" class="fin-pill-btn ${activeTypeFilter === 'expense' ? 'active' : ''}" data-filter="expense">
            Despesas (${expenseCount})
          </button>
        </div>

        <button class="btn btn-primary" id="btn-new-transaction">
          ${getIcon('plus')}
          <span>Novo Lançamento</span>
        </button>
      </div>

      <!-- TABELA / LISTA DE TRANSAÇÕES DO PERÍODO -->
      <div class="card transaction-list-card">
        <div class="card-header-clean">
          <h3>Histórico de Transações</h3>
          <span class="text-muted-xs">${filteredList.length} lançamentos neste filtro</span>
        </div>

        <div class="transactions-list" id="transactions-container">
          ${filteredList.length === 0 ? `
            <div class="empty-state-simple">
              <span class="empty-icon">${getIcon('finances')}</span>
              <p>Nenhuma transação encontrada para este período e filtro.</p>
            </div>
          ` : filteredList.map(t => {
            const isIncome = t.type === 'income';
            const formattedVal = parseFloat(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            return `
              <div class="transaction-row" data-id="${t.id}">
                <div class="t-left">
                  <div class="t-type-icon ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '↑' : '↓'}
                  </div>
                  <div class="t-info">
                    <span class="t-description">${escapeHtml(t.description || 'Lançamento')}</span>
                    <div class="t-meta">
                      <span class="t-category-badge">${escapeHtml(t.category || 'Geral')}</span>
                      <span class="t-date">${formatDisplayDate(t.date)}</span>
                    </div>
                  </div>
                </div>
                <div class="t-right">
                  <span class="t-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'} R$ ${formattedVal}
                  </span>
                  <button type="button" class="t-delete-btn" data-action="delete" title="Excluir lançamento">
                    ${getIcon('trash')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // Ouvintes de filtro de Período (Semana, Mês, Ano, Todos)
  container.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      activePeriodFilter = btn.getAttribute('data-period');
      renderFinances(container);
    });
  });

  // Ouvintes de filtro de Tipo de Transação (Todos, Receitas, Despesas)
  container.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTypeFilter = btn.getAttribute('data-filter');
      renderFinances(container);
    });
  });

  // Novo lançamento com modal padronizado
  container.querySelector('#btn-new-transaction')?.addEventListener('click', () => {
    openNewTransactionModal(container);
  });

  // Exclusão de transação
  container.querySelectorAll('.t-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const row = btn.closest('.transaction-row');
      const id = row?.getAttribute('data-id');
      if (id) {
        const currentData = StorageService.getData();
        const updated = (currentData.finances?.transactions || []).filter(item => item.id !== id);
        await StorageService.updateSection('finances', { transactions: updated });
        showToast('Lançamento excluído com sucesso!', 'success');
        renderFinances(container);
      }
    });
  });
}

function openNewTransactionModal(container) {
  let selectedType = 'expense';

  const contentHtml = `
    <div class="form-group" style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Tipo de Transação</label>
      <div style="display: flex; gap: 10px;">
        <button type="button" id="toggle-type-expense" class="tab-pill active" style="flex: 1; text-align: center; justify-content: center;">
          ↓ Despesa
        </button>
        <button type="button" id="toggle-type-income" class="tab-pill" style="flex: 1; text-align: center; justify-content: center;">
          ↑ Receita
        </button>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 14px;">
      <label for="tx-amount" style="display: block; margin-bottom: 6px; font-weight: 500;">Valor (R$)</label>
      <input type="number" step="0.01" min="0.01" id="tx-amount" placeholder="0,00" required style="width: 100%;" />
    </div>

    <div class="form-group" style="margin-bottom: 14px;">
      <label for="tx-description" style="display: block; margin-bottom: 6px; font-weight: 500;">Descrição</label>
      <input type="text" id="tx-description" placeholder="Ex: Supermercado, Salário, Internet" required style="width: 100%;" />
    </div>

    <div class="form-group" style="margin-bottom: 14px;">
      <label for="tx-category" style="display: block; margin-bottom: 6px; font-weight: 500;">Categoria</label>
      <select id="tx-category" style="width: 100%;">
        <option value="Alimentação">Alimentação</option>
        <option value="Moradia">Moradia</option>
        <option value="Transporte">Transporte</option>
        <option value="Saúde">Saúde</option>
        <option value="Lazer">Lazer</option>
        <option value="Educação">Educação</option>
        <option value="Salário">Salário</option>
        <option value="Investimentos">Investimentos</option>
        <option value="Geral">Geral</option>
        <option value="Outros">Outros</option>
      </select>
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label for="tx-date" style="display: block; margin-bottom: 6px; font-weight: 500;">Data</label>
      <input type="date" id="tx-date" value="${getTodayDateString()}" required style="width: 100%;" />
    </div>
  `;

  openModal({
    title: 'Novo Lançamento Financeiro',
    contentHtml,
    confirmText: 'Salvar Lançamento',
    onOpen: (dialog) => {
      const btnExp = dialog.querySelector('#toggle-type-expense');
      const btnInc = dialog.querySelector('#toggle-type-income');

      btnExp?.addEventListener('click', () => {
        selectedType = 'expense';
        btnExp.classList.add('active');
        btnInc.classList.remove('active');
      });

      btnInc?.addEventListener('click', () => {
        selectedType = 'income';
        btnInc.classList.add('active');
        btnExp.classList.remove('active');
      });

      dialog.querySelector('#tx-amount')?.focus();
    },
    onConfirm: async ({ dialog, setError }) => {
      const amountInput = dialog.querySelector('#tx-amount');
      const descInput = dialog.querySelector('#tx-description');
      const catInput = dialog.querySelector('#tx-category');
      const dateInput = dialog.querySelector('#tx-date');

      const amount = parseFloat(amountInput?.value || 0);
      const description = descInput?.value.trim() || '';
      const category = catInput?.value || 'Outros';
      const date = dateInput?.value || getTodayDateString();

      if (!amount || isNaN(amount) || amount <= 0) {
        setError('Por favor, informe um valor válido maior que zero.');
        return false;
      }

      if (!description) {
        setError('Por favor, informe uma descrição para o lançamento.');
        return false;
      }

      const newTx = {
        id: `fin-${Date.now()}`,
        type: selectedType,
        amount,
        description,
        category,
        date,
        createdAt: new Date().toISOString()
      };

      const currentData = StorageService.getData();
      const existing = currentData.finances?.transactions || [];
      await StorageService.updateSection('finances', {
        transactions: [newTx, ...existing]
      });

      showToast('Lançamento adicionado com sucesso!', 'success');
      renderFinances(container);
      return true;
    }
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
