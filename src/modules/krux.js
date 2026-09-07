/**
 * Módulo Krux — IA de Produtividade, Foco e Execução do Nodus
 * Equipado com Motor Local Offline (NLP) + Integração Full-Stack
 * Executa ações reais em tempo real: Tarefas, Agenda, Hábitos, Finanças, Check-ins
 */
import { StorageService } from '../services/storageService.js';
import { KruxLocalEngine } from '../services/kruxLocalEngine.js';
import { getIcon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';

let chatHistory = [];
let useLocalEngineOnly = false; // toggle para motor local vs híbrido

export function renderKrux(container) {
  const data = StorageService.getData();
  const settings = StorageService.getSettings();
  const userName = settings.user?.name ? settings.user.name.split(' ')[0] : '';

  container.innerHTML = `
    <div class="kore-view-layout krux-view-layout">
      <!-- Cabeçalho do Krux -->
      <div class="kore-hero-box krux-hero-box">
        <div class="kore-avatar-box krux-avatar-box">
          ${getIcon('krux') || getIcon('kore')}
        </div>
        <div class="kore-hero-content">
          <div class="kore-title-row">
            <h2>Krux IA</h2>
            <div class="krux-engine-badge" id="krux-engine-toggle" title="Clique para alternar entre Motor Local ou Nuvem">
              <span class="kore-pulse"></span>
              <span id="krux-engine-status-text">⚡ Motor Local Ativo (Interpretação Precisa)</span>
            </div>
          </div>
          <p class="kore-subtitle">Seu mentor de produtividade e assistente ativo do Nodus. O Krux entende linguagem natural em português e <strong>executa ações reais</strong>: cria compromissos na agenda, adiciona tarefas com prioridade, lança gastos e faz seu check-in.</p>
        </div>
      </div>

      <!-- Sugestões Rápidas de Ações e Análises -->
      <div class="kore-suggestions-row" id="kore-suggestions">
        <button class="kore-suggestion-chip" data-prompt="Krux, marca reunião amanhã às 15h na minha agenda">
          <span>📅</span>
          <span>Marcar na agenda</span>
        </button>
        <button class="kore-suggestion-chip" data-prompt="Tenho uma tarefa pra fazer amanhã até 16hrs marca lá: Enviar proposta comercial">
          <span>⚡</span>
          <span>Criar tarefa rápida</span>
        </button>
        <button class="kore-suggestion-chip" data-prompt="Gastei 45 no almoço">
          <span>💳</span>
          <span>Registrar gasto</span>
        </button>
        <button class="kore-suggestion-chip" data-prompt="Marca meu check-in de hoje no desafio">
          <span>🔥</span>
          <span>Check-in Desafio</span>
        </button>
        <button class="kore-suggestion-chip" data-prompt="Quais são minhas principais prioridades para hoje e como devo organizar meu dia?">
          <span>🎯</span>
          <span>Prioridades & Foco</span>
        </button>
        <button class="kore-suggestion-chip" data-prompt="Dê um balanço completo das minhas finanças, receitas, despesas e saldo atual.">
          <span>💰</span>
          <span>Balanço Financeiro</span>
        </button>
      </div>

      <!-- Área de Conversação -->
      <div class="kore-chat-container" id="kore-chat-messages">
        <!-- Mensagem de boas-vindas inicial -->
        <div class="kore-message kore-message-assistant">
          <div class="kore-msg-avatar">${getIcon('krux') || getIcon('kore')}</div>
          <div class="kore-msg-bubble">
            <p>Olá${userName ? `, <strong>${escapeHtml(userName)}</strong>` : ''}! Sou o <strong>Krux</strong>, sua inteligência artificial local de foco e execução no Nodus.</p>
            <p>Fui atualizado com um <strong>motor de interpretação local dedicado</strong>, sem falhas de entendimento. Você pode me pedir coisas como:</p>
            <ul style="margin: 8px 0; padding-left: 18px; font-size: 13px; line-height: 1.6;">
              <li><em>"Krux, marca reunião amanhã às 15h na agenda"</em></li>
              <li><em>"Tenho uma tarefa pra fazer amanhã às 16hrs urgente: enviar proposta"</em></li>
              <li><em>"Gastei 50 no almoço com o cliente"</em></li>
              <li><em>"Marca meu check-in de hoje no desafio"</em></li>
              <li><em>"Quais são minhas tarefas pendentes de alta prioridade?"</em></li>
            </ul>
            <p>Como posso otimizar seu foco hoje?</p>
          </div>
        </div>
      </div>

      <!-- Barra de Input do Chat -->
      <div class="kore-input-container">
        <div class="kore-input-wrapper">
          <input 
            type="text" 
            id="kore-input-field" 
            placeholder="Diga ao Krux para agendar compromisso, criar tarefa, registrar finança ou tirar dúvidas..." 
            autocomplete="off"
          />
          <button class="kore-send-btn" id="kore-send-btn" title="Enviar mensagem">
            ${getIcon('send')}
          </button>
        </div>
        <div class="kore-input-footer" style="display: flex; align-items: center; justify-content: space-between;">
          <span>⚡ Krux IA • Motor Local de Alta Precisão & Execução no Nodus</span>
          <span style="font-size: 11px; opacity: 0.75;">Pressione Enter para enviar</span>
        </div>
      </div>
    </div>
  `;

  const messagesContainer = container.querySelector('#kore-chat-messages');
  const inputField = container.querySelector('#kore-input-field');
  const sendBtn = container.querySelector('#kore-send-btn');
  const suggestions = container.querySelectorAll('.kore-suggestion-chip');
  const engineToggle = container.querySelector('#krux-engine-toggle');
  const engineStatusText = container.querySelector('#krux-engine-status-text');

  if (engineToggle) {
    engineToggle.addEventListener('click', () => {
      useLocalEngineOnly = !useLocalEngineOnly;
      if (useLocalEngineOnly) {
        engineStatusText.textContent = '⚡ Motor 100% Local (Offline)';
        showToast('Krux configurado para Motor Local Offline', 'info');
      } else {
        engineStatusText.textContent = '⚡ Motor Local Ativo (Interpretação Precisa)';
        showToast('Krux configurado para Modo Inteligente Híbrido', 'info');
      }
    });
  }

  // Restaura histórico se houver
  if (chatHistory.length > 0) {
    chatHistory.forEach(item => {
      appendMessage(item.role, item.text, false, item.action);
    });
  }

  function appendMessage(role, text, save = true, action = null) {
    if (save) {
      chatHistory.push({ role, text, action });
    }

    const msgEl = document.createElement('div');
    msgEl.className = `kore-message kore-message-${role}`;
    
    let actionBadgeHtml = '';
    if (action) {
      let icon = '✓';
      let title = 'Ação Executada com Sucesso';
      if (action.type === 'create_event') {
        icon = '📅';
        title = `Agendado na Agenda: ${action.data.title} (${action.data.date} às ${action.data.time})`;
      } else if (action.type === 'create_task') {
        icon = '📋';
        title = `Tarefa Criada: ${action.data.title} (Prazo: ${action.data.dueDate} ${action.data.time || ''})`;
      } else if (action.type === 'create_habit') {
        icon = '⚡';
        title = `Hábito Adicionado: ${action.data.title}`;
      } else if (action.type === 'create_transaction') {
        icon = '💰';
        title = `Transação Registrada: R$ ${action.data.amount} (${action.data.description})`;
      } else if (action.type === 'challenge_checkin') {
        icon = '🔥';
        title = `Check-in de Hoje Confirmado!`;
      }

      actionBadgeHtml = `
        <div class="kore-action-badge" style="margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; background: var(--accent-subtle); border: 1px solid var(--accent); color: var(--accent); padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 600;">
          <span>${icon}</span>
          <span>${escapeHtml(title)}</span>
        </div>
      `;
    }

    if (role === 'assistant') {
      msgEl.innerHTML = `
        <div class="kore-msg-avatar">${getIcon('krux') || getIcon('kore')}</div>
        <div class="kore-msg-bubble">
          ${formatMarkdown(text)}
          ${actionBadgeHtml}
        </div>
      `;
    } else {
      msgEl.innerHTML = `
        <div class="kore-msg-bubble">
          <p>${escapeHtml(text)}</p>
        </div>
      `;
    }

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function formatMarkdown(str) {
    let formatted = escapeHtml(str);
    // Negrito: **texto**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Itálico: *texto*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Tópicos com marcadores (bullet points): • ou -
    formatted = formatted.replace(/(?:^|\n)[•-]\s+(.+)/g, '\n<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Parágrafos
    formatted = formatted.split('\n\n').map(p => {
      if (p.startsWith('<ul>')) return p;
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    }).join('');
    return formatted;
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

  async function applyActionLocally(action) {
    const data = StorageService.getData();
    const todayStr = new Date().toISOString().slice(0, 10);

    if (action.type === 'create_event') {
      if (!Array.isArray(data.events)) data.events = [];
      data.events.push({
        id: `ev-${Date.now()}`,
        title: action.data.title || 'Compromisso',
        date: action.data.date || todayStr,
        time: action.data.time || '10:00',
        description: action.data.description || '',
        type: 'event'
      });
      data.events.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      await StorageService.saveData(data);
      showToast(`✓ Agendado na Agenda: "${action.data.title}"!`, 'success');
    } else if (action.type === 'create_task') {
      if (!Array.isArray(data.tasks)) data.tasks = [];
      data.tasks.unshift({
        id: `task-${Date.now()}`,
        title: action.data.title || 'Nova tarefa',
        priority: action.data.priority || 'alta',
        dueDate: action.data.dueDate || todayStr,
        time: action.data.time || '',
        completed: false,
        createdAt: new Date().toISOString()
      });
      await StorageService.saveData(data);
      showToast(`✓ Tarefa criada: "${action.data.title}"!`, 'success');
    } else if (action.type === 'create_habit') {
      if (!Array.isArray(data.habits)) data.habits = [];
      data.habits.push({
        id: `h-${Date.now()}`,
        title: action.data.title || 'Novo hábito',
        streak: 0,
        completedDates: [],
        createdAt: new Date().toISOString()
      });
      await StorageService.saveData(data);
      showToast(`✓ Hábito adicionado: "${action.data.title}"!`, 'success');
    } else if (action.type === 'create_transaction') {
      if (!data.finances) data.finances = { transactions: [] };
      if (!Array.isArray(data.finances.transactions)) data.finances.transactions = [];
      data.finances.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: action.data.type || 'expense',
        amount: Number(action.data.amount) || 0,
        description: action.data.description || 'Lançamento',
        category: action.data.category || 'Geral',
        date: action.data.date || todayStr
      });
      await StorageService.saveData(data);
      showToast(`✓ Transação registrada: "${action.data.description}"!`, 'success');
    } else if (action.type === 'challenge_checkin') {
      if (!Array.isArray(data.challenges)) data.challenges = [];
      if (data.challenges.length === 0) {
        data.challenges.push({
          id: 'escape21',
          title: 'Escape21',
          daysTotal: 21,
          daysRemaining: 21,
          progress: 0,
          checkins: []
        });
      }
      const ch = data.challenges[0];
      if (!Array.isArray(ch.checkins)) ch.checkins = [];
      if (!ch.checkins.includes(todayStr)) {
        ch.checkins.push(todayStr);
        const total = ch.daysTotal || 21;
        ch.daysRemaining = Math.max(0, total - ch.checkins.length);
        ch.progress = Math.min(100, Math.round((ch.checkins.length / total) * 100));
        await StorageService.saveData(data);
        showToast(`🔥 Check-in do Desafio registrado!`, 'success');
      }
    }

    StorageService.notify();
  }

  async function handleSend(promptText) {
    const text = (promptText || inputField.value || '').trim();
    if (!text) return;

    appendMessage('user', text);
    if (!promptText) inputField.value = '';

    // Indicador de digitação
    const loadingEl = document.createElement('div');
    loadingEl.className = 'kore-message kore-message-assistant kore-loading';
    loadingEl.innerHTML = `
      <div class="kore-msg-avatar">${getIcon('krux') || getIcon('kore')}</div>
      <div class="kore-msg-bubble">
        <div class="kore-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(loadingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Se o usuário marcou para usar apenas o motor local ou se a conexão cair:
    if (useLocalEngineOnly) {
      setTimeout(async () => {
        loadingEl.remove();
        const currentData = StorageService.getData();
        const localResult = KruxLocalEngine.process(text, currentData);
        if (localResult.action) {
          await applyActionLocally(localResult.action);
        }
        appendMessage('assistant', localResult.reply, true, localResult.action);
      }, 150);
      return;
    }

    try {
      // Chama o backend real de IA do Nodus (com suporte ao endpoint Krux)
      const res = await fetch('/api/krux/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: chatHistory.slice(-6),
          forceLocal: false
        })
      });

      loadingEl.remove();

      if (res.ok) {
        const dataRes = await res.json();
        const reply = dataRes.reply || 'Processamento concluído.';
        const action = dataRes.action || null;

        // Se uma ação foi executada pelo backend, recarrega o estado local
        if (action) {
          await StorageService.loadData();
          StorageService.notify();

          if (action.type === 'create_event') {
            showToast(`✓ Agendado na Agenda: "${action.data.title}"!`, 'success');
          } else if (action.type === 'create_task') {
            showToast(`✓ Tarefa criada: "${action.data.title}"!`, 'success');
          } else if (action.type === 'create_habit') {
            showToast(`✓ Hábito cadastrado: "${action.data.title}"!`, 'success');
          } else if (action.type === 'create_transaction') {
            showToast(`✓ Lançamento registrado: "${action.data.description}"!`, 'success');
          } else if (action.type === 'challenge_checkin') {
            showToast(`🔥 Check-in registrado com sucesso!`, 'success');
          }
        }

        appendMessage('assistant', reply, true, action);
      } else {
        // Fallback imediato para o motor local
        const currentData = StorageService.getData();
        const localResult = KruxLocalEngine.process(text, currentData);
        if (localResult.action) {
          await applyActionLocally(localResult.action);
        }
        appendMessage('assistant', localResult.reply, true, localResult.action);
      }
    } catch (err) {
      console.warn('Conexão ao servidor falhou, executando via Motor Local Krux:', err);
      loadingEl.remove();
      // Execução 100% offline via KruxLocalEngine
      const currentData = StorageService.getData();
      const localResult = KruxLocalEngine.process(text, currentData);
      if (localResult.action) {
        await applyActionLocally(localResult.action);
      }
      appendMessage('assistant', localResult.reply, true, localResult.action);
    }
  }

  sendBtn.addEventListener('click', () => handleSend());
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  suggestions.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      handleSend(prompt);
    });
  });

  inputField.focus();
}

// Exporta compatibilidade para qualquer import legado de renderKore
export const renderKore = renderKrux;
