/**
 * Nodus — Krux Local Engine & Action Executor (Server-Side)
 * 
 * Processador de linguagem natural e executor de ações diretas no banco de dados.
 */

export interface KruxActionResult {
  reply: string;
  action: { type: string; data: any } | null;
  isConfidentAction: boolean;
}

/**
 * Aplica uma ação gerada pelo Krux diretamente na estrutura do banco de dados (db.json)
 */
export function applyKruxActionToDatabase(action: { type: string; data: any }, db: any) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (action.type === "create_event") {
    if (!Array.isArray(db.events)) db.events = [];
    const newEvent = {
      id: `ev-${Date.now()}`,
      title: action.data.title || "Compromisso",
      date: action.data.date || today,
      time: action.data.time || "09:00",
      description: action.data.description || "",
      type: "event"
    };
    db.events.push(newEvent);
    db.events.sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return newEvent;
  }

  if (action.type === "create_task") {
    if (!Array.isArray(db.tasks)) db.tasks = [];
    const newTask = {
      id: `task-${Date.now()}`,
      title: action.data.title || "Nova tarefa",
      priority: action.data.priority || "alta",
      dueDate: action.data.dueDate || today,
      time: action.data.time || "",
      completed: false,
      createdAt: now.toISOString()
    };
    db.tasks.unshift(newTask);
    return newTask;
  }

  if (action.type === "create_habit") {
    if (!Array.isArray(db.habits)) db.habits = [];
    const newHabit = {
      id: `h-${Date.now()}`,
      title: action.data.title || "Novo hábito",
      streak: 0,
      completedDates: [],
      createdAt: now.toISOString()
    };
    db.habits.push(newHabit);
    return newHabit;
  }

  if (action.type === "create_transaction") {
    if (!db.finances) db.finances = { transactions: [] };
    if (!Array.isArray(db.finances.transactions)) db.finances.transactions = [];
    const newTx = {
      id: `tx-${Date.now()}`,
      type: action.data.type || "expense",
      amount: Number(action.data.amount) || 0,
      description: action.data.description || "Lançamento",
      category: action.data.category || "Geral",
      date: action.data.date || today
    };
    db.finances.transactions.unshift(newTx);
    return newTx;
  }

  if (action.type === "challenge_checkin") {
    if (!Array.isArray(db.challenges)) db.challenges = [];
    if (db.challenges.length === 0) {
      db.challenges.push({
        id: "nodus21",
        title: "Desafio Nodus 21",
        daysTotal: 21,
        daysRemaining: 21,
        progress: 0,
        checkins: []
      });
    }
    const ch = db.challenges[0];
    if (!Array.isArray(ch.checkins)) ch.checkins = [];
    if (!ch.checkins.includes(today)) {
      ch.checkins.push(today);
      const total = ch.daysTotal || 21;
      ch.daysRemaining = Math.max(0, total - ch.checkins.length);
      ch.progress = Math.min(100, Math.round((ch.checkins.length / total) * 100));
    }
    return ch;
  }
}

/**
 * Motor de interpretação em linguagem natural offline do Krux
 */
export function executeKruxLocalEngine(query: string, data: any): KruxActionResult {
  const text = query.trim();
  const lower = text.toLowerCase();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  // 1. Agendamento
  const isAgenda = lower.includes("agenda") || (lower.includes("marca") && (lower.includes("às") || lower.includes("as ") || lower.includes("horas") || lower.includes("hrs") || lower.includes("amanhã") || lower.includes("amanha")));
  if (isAgenda && !lower.includes("tarefa")) {
    const isTomorrow = lower.includes("amanhã") || lower.includes("amanha");
    const targetDate = isTomorrow ? tomorrow : today;
    
    let targetTime = "10:00";
    const matchColon = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (matchColon) {
      targetTime = `${matchColon[1].padStart(2, '0')}:${matchColon[2]}`;
    } else {
      const matchHour = lower.match(/(?:às|as)?\s*\b([01]?\d|2[0-3])\s*(?:h|hrs|horas)?\b/);
      if (matchHour && (lower.includes('h') || lower.includes('às') || lower.includes('as '))) {
        const h = parseInt(matchHour[1], 10);
        if (h >= 0 && h <= 23) {
          targetTime = `${h.toString().padStart(2, '0')}:00`;
        }
      }
    }

    let title = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/marca isso na minha agenda/gi, '')
      .replace(/marca na minha agenda/gi, '')
      .replace(/marca na agenda/gi, '')
      .replace(/marcar na agenda/gi, '')
      .replace(/agendar/gi, '')
      .replace(/marca(r)? lá/gi, '')
      .replace(/marca(r)?/gi, '')
      .replace(/amanhã/gi, '')
      .replace(/amanha/gi, '')
      .replace(/hoje/gi, '')
      .replace(/às \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/as \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!title || title.length < 2) title = "Compromisso Agendado";
    else title = title.charAt(0).toUpperCase() + title.slice(1);

    const action = {
      type: "create_event",
      data: {
        title,
        date: targetDate,
        time: targetTime,
        description: "Agendado pelo Krux Local"
      }
    };

    return {
      reply: `🗓️ **Agendado com Sucesso!**\n\nMarquei **${title}** na sua agenda para **${targetDate === today ? 'Hoje' : 'Amanhã'} (${targetDate})** às **${targetTime}**.`,
      action,
      isConfidentAction: true
    };
  }

  // 2. Tarefa
  const isTask = (lower.includes("tarefa") || lower.includes("todo") || lower.includes("fazer")) && (lower.includes("cria") || lower.includes("marca") || lower.includes("adiciona") || lower.includes("tenho uma tarefa") || lower.includes("nova tarefa"));
  if (isTask) {
    const isTomorrow = lower.includes("amanhã") || lower.includes("amanha");
    const targetDate = isTomorrow ? tomorrow : today;

    let targetTime = "";
    const matchColon = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (matchColon) {
      targetTime = `${matchColon[1].padStart(2, '0')}:${matchColon[2]}`;
    } else {
      const matchHour = lower.match(/(?:até|ate|às|as)?\s*\b([01]?\d|2[0-3])\s*(?:h|hrs)?\b/);
      if (matchHour && (lower.includes('h') || lower.includes('até') || lower.includes('às'))) {
        const h = parseInt(matchHour[1], 10);
        if (h >= 0 && h <= 23) targetTime = `${h.toString().padStart(2, '0')}:00`;
      }
    }

    const priority = lower.includes("urgente") || lower.includes("alta") ? "alta" : lower.includes("baixa") ? "baixa" : "alta";

    let title = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/tenho uma tarefa pra fazer/gi, '')
      .replace(/tenho uma tarefa para fazer/gi, '')
      .replace(/tenho uma tarefa/gi, '')
      .replace(/cria(r)? tarefa/gi, '')
      .replace(/adiciona(r)? tarefa/gi, '')
      .replace(/marca(r)? tarefa/gi, '')
      .replace(/marca(r)? lá/gi, '')
      .replace(/marca(r)?/gi, '')
      .replace(/amanhã/gi, '')
      .replace(/amanha/gi, '')
      .replace(/hoje/gi, '')
      .replace(/urgente/gi, '')
      .replace(/alta prioridade/gi, '')
      .replace(/baixa prioridade/gi, '')
      .replace(/(?:até|ate|às|as)\s*\d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!title || title.length < 2) title = "Nova Tarefa";
    else title = title.charAt(0).toUpperCase() + title.slice(1);

    const action = {
      type: "create_task",
      data: {
        title,
        priority,
        dueDate: targetDate,
        time: targetTime
      }
    };

    return {
      reply: `⚡ **Tarefa Criada!**\n\nAdicionei **${title}** à sua lista de tarefas como **Prioridade ${priority.toUpperCase()}** para **${targetDate === today ? 'Hoje' : 'Amanhã'}**${targetTime ? ` às ${targetTime}` : ''}.`,
      action,
      isConfidentAction: true
    };
  }

  // 3. Finanças
  const isFinance = lower.includes("gastei") || lower.includes("paguei") || lower.includes("comprei") || lower.includes("recebi") || lower.includes("ganhei") || lower.includes("depósito") || lower.includes("pix");
  if (isFinance) {
    const isIncome = lower.includes("recebi") || lower.includes("ganhei") || lower.includes("depósito") || lower.includes("pix recebido") || lower.includes("salário");
    const type = isIncome ? "income" : "expense";

    let amount = 0;
    const matchAmount = lower.match(/(?:r\$|\$)?\s*(\d+(?:[.,]\d{1,2})?)/);
    if (matchAmount) {
      amount = parseFloat(matchAmount[1].replace(',', '.'));
    }

    let description = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/(?:r\$|\$)?\s*\d+(?:[.,]\d{1,2})?/gi, '')
      .replace(/gastei/gi, '')
      .replace(/paguei/gi, '')
      .replace(/comprei/gi, '')
      .replace(/recebi/gi, '')
      .replace(/ganhei/gi, '')
      .replace(/com\b/gi, '')
      .replace(/no\b/gi, '')
      .replace(/na\b/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!description || description.length < 2) description = isIncome ? "Receita avulsa" : "Despesa avulsa";
    else description = description.charAt(0).toUpperCase() + description.slice(1);

    let category = "Geral";
    if (lower.includes("almoço") || lower.includes("jantar") || lower.includes("comida") || lower.includes("lanche") || lower.includes("mercado") || lower.includes("restaurante")) category = "Alimentação";
    else if (lower.includes("uber") || lower.includes("gasolina") || lower.includes("passagem") || lower.includes("ônibus")) category = "Transporte";
    else if (lower.includes("salário") || lower.includes("freela") || lower.includes("cliente")) category = "Trabalho";

    if (amount > 0) {
      const action = {
        type: "create_transaction",
        data: {
          type,
          amount,
          description,
          category,
          date: today
        }
      };

      return {
        reply: `💰 **Finança Registrada!**\n\nLancei ${isIncome ? 'uma receita de' : 'um gasto de'} **R$ ${amount.toFixed(2)}** em **${category}** (*${description}*).`,
        action,
        isConfidentAction: true
      };
    }
  }

  // 4. Hábitos
  const isHabit = lower.includes("hábito") || lower.includes("habito");
  if (isHabit && (lower.includes("cria") || lower.includes("novo") || lower.includes("adiciona"))) {
    let title = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/cria(r)? novo hábito/gi, '')
      .replace(/cria(r)? hábito/gi, '')
      .replace(/adiciona(r)? hábito/gi, '')
      .replace(/novo hábito/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!title) title = "Novo Hábito";
    else title = title.charAt(0).toUpperCase() + title.slice(1);

    const action = {
      type: "create_habit",
      data: { title }
    };

    return {
      reply: `🌱 **Hábito Criado!**\n\nAdicionei **${title}** ao seu rastreador diário. Consistência é o segredo!`,
      action,
      isConfidentAction: true
    };
  }

  // 5. Check-in de Desafio
  const isCheckin = lower.includes("check-in") || lower.includes("checkin") || lower.includes("marcar dia") || (lower.includes("marca") && lower.includes("desafio"));
  if (isCheckin) {
    const ch = (data.challenges || [])[0];
    const checkins = ch?.checkins || [];
    const alreadyDone = checkins.includes(today);

    if (alreadyDone) {
      return {
        reply: `🔥 Seu check-in de hoje já está confirmado! Você já completou **${checkins.length} dias** no **${ch?.title || 'Desafio'}**. Mantenha o foco!`,
        action: null,
        isConfidentAction: false
      };
    }

    return {
      reply: `🔥 **Check-in Registrado!**\n\nParabéns! Mais um dia cumprido no seu desafio. Seu Score agora é de **${checkins.length + 1} dias**!`,
      action: { type: "challenge_checkin", data: { challengeId: ch?.id || "nodus21", date: today } },
      isConfidentAction: true
    };
  }

  // Resumos e consultas
  const tasks = data.tasks || [];
  const pending = tasks.filter((t: any) => !t.completed);
  const high = pending.filter((t: any) => t.priority === "alta");
  const finances = data.finances?.transactions || [];
  const challenges = data.challenges || [];

  if (lower.includes("prioridade") || lower.includes("tarefa") || lower.includes("fazer hoje")) {
    if (pending.length === 0) {
      return {
        reply: "🎉 **Todas as suas tarefas estão concluídas!** Nenhuma pendência no Nodus no momento.",
        action: null,
        isConfidentAction: false
      };
    }
    let res = `📋 **Você tem ${pending.length} tarefas pendentes no Nodus:**\n\n`;
    if (high.length > 0) {
      res += `🚨 **Alta Prioridade:**\n` + high.map((t: any) => `• **${t.title}**`).join("\n") + "\n\n";
    }
    const others = pending.filter((t: any) => t.priority !== "alta");
    if (others.length > 0) {
      res += `📌 **Outras:**\n` + others.map((t: any) => `• ${t.title}`).join("\n");
    }
    return { reply: res, action: null, isConfidentAction: false };
  }

  if (lower.includes("finança") || lower.includes("saldo") || lower.includes("gasto")) {
    let inc = 0, exp = 0;
    finances.forEach((t: any) => {
      const v = Number(t.amount) || 0;
      if (t.type === "income") inc += v;
      else exp += v;
    });
    const bal = inc - exp;
    return {
      reply: `💰 **Resumo Financeiro Nodus:**\n\n• **Receitas:** R$ ${inc.toFixed(2)}\n• **Despesas:** R$ ${exp.toFixed(2)}\n• **Saldo:** R$ ${bal.toFixed(2)} (${bal >= 0 ? 'Positivo' : 'Negativo'})`,
      action: null,
      isConfidentAction: false
    };
  }

  if (lower.includes("desafio") || lower.includes("score")) {
    const ch = challenges[0];
    const days = (ch?.checkins || []).length;
    return {
      reply: `🔥 **Status do ${ch?.title || 'Desafio'}:**\n\n• **Score:** ${days} dias cumpridos\n• **Dias restantes:** ${ch?.daysRemaining ?? Math.max(0, 21 - days)}\n• **Progresso:** ${ch?.progress || Math.round((days / 21) * 100)}%`,
      action: null,
      isConfidentAction: false
    };
  }

  return {
    reply: `Olá! Sou o **Krux**, seu assistente de produtividade local no Nodus.\n\n` +
           `Você tem **${pending.length} tarefas pendentes** e **${(challenges[0]?.checkins || []).length} dias cumpridos** no seu desafio.\n\n` +
           `Exemplos de como posso te ajudar:\n` +
           `• *"Krux, marca reunião amanhã às 15h"*\n` +
           `• *"Tenho uma tarefa pra amanhã às 16hrs: enviar relatório"*\n` +
           `• *"Gastei 45 no almoço"*\n` +
           `• *"Como está meu desafio?"* ou *"Marca meu check-in de hoje"*`,
    action: null,
    isConfidentAction: false
  };
}
