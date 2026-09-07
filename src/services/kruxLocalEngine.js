/**
 * Motor de Inteligência Local do Krux (Offline AI Engine)
 * 
 * Processamento de Linguagem Natural (NLP) em Português Brasileiro,
 * classificação de intenções, extração de entidades (datas, horários, prioridades,
 * valores monetários, categorias) e geração contextual de respostas e ações reais.
 * 
 * Executa 100% no cliente ou backend sem latência e sem depender de chaves de API.
 */

export const KruxLocalEngine = {
  /**
   * Processa a mensagem do usuário contra o estado atual do banco
   * @param {string} message - Pergunta ou comando do usuário
   * @param {object} db - Estado atual dos dados (db.json)
   * @returns {object} { reply: string, action: object|null, isLocalEngine: true }
   */
  process(message, db = {}) {
    if (!message || typeof message !== 'string') {
      return {
        reply: 'Olá! Como posso te ajudar a organizar sua produtividade, tarefas ou rotina no Nodus?',
        action: null,
        isLocalEngine: true
      };
    }

    const text = message.trim();
    const lower = text.toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Detecção de Agendamento de Evento / Compromisso
    if (this.isEventIntent(lower)) {
      return this.handleEventCreation(text, lower, db, now);
    }

    // 2. Detecção de Criação de Tarefa
    if (this.isTaskIntent(lower)) {
      return this.handleTaskCreation(text, lower, db, now);
    }

    // 3. Detecção de Criação de Hábito
    if (this.isHabitIntent(lower)) {
      return this.handleHabitCreation(text, lower, db, now);
    }

    // 4. Detecção de Lançamento Financeiro (Gasto / Receita)
    if (this.isFinanceIntent(lower)) {
      return this.handleFinanceCreation(text, lower, db, now);
    }

    // 5. Check-in do Desafio
    if (lower.includes('check-in') || lower.includes('checkin') || (lower.includes('marca') && lower.includes('desafio'))) {
      return this.handleChallengeCheckin(text, lower, db, todayStr);
    }

    // 6. Consultas Analíticas e Resumos
    if (this.isTasksQuery(lower)) {
      return this.handleTasksSummary(db);
    }

    if (this.isFinancesQuery(lower)) {
      return this.handleFinancesSummary(db);
    }

    if (this.isHabitsQuery(lower)) {
      return this.handleHabitsSummary(db, todayStr);
    }

    if (this.isChallengeQuery(lower)) {
      return this.handleChallengeSummary(db, todayStr);
    }

    if (this.isAgendaQuery(lower)) {
      return this.handleAgendaSummary(db, todayStr);
    }

    if (this.isReadingQuery(lower)) {
      return this.handleReadingSummary(db);
    }

    if (this.isDiaryQuery(lower)) {
      return this.handleDiarySummary(db, todayStr);
    }

    if (this.isProductivityAdviceQuery(lower)) {
      return this.handleProductivityAdvice(db, todayStr);
    }

    // 7. Resposta Geral Contextual
    return this.handleGeneralContextual(text, db, todayStr);
  },

  // --- INTENT CLASSIFIERS ---

  isEventIntent(lower) {
    const triggers = ['agenda', 'marcar na agenda', 'marca na agenda', 'marca na minha agenda', 'agendar', 'compromisso', 'reunião'];
    const hasTrigger = triggers.some(t => lower.includes(t));
    const hasTimeOrDate = lower.includes('às') || lower.includes('as ') || lower.includes('horas') || lower.includes('hrs') || lower.includes('amanhã') || lower.includes('amanha') || lower.includes('dia ');
    
    // Se explicitamente pede para agendar ou se tem "marca" + hora/data sem ser tarefa
    return (hasTrigger && (hasTimeOrDate || lower.includes('marca') || lower.includes('agend'))) ||
           (lower.startsWith('marca') && (lower.includes('às') || lower.includes('as ')) && !lower.includes('tarefa'));
  },

  isTaskIntent(lower) {
    const triggers = ['tarefa', 'to-do', 'todo', 'fazer amanhã', 'preciso fazer', 'lembrete'];
    const actionWords = ['cria', 'criar', 'adiciona', 'adicionar', 'marca', 'marcar', 'tenho uma tarefa', 'nova tarefa'];
    return triggers.some(t => lower.includes(t)) && actionWords.some(a => lower.includes(a));
  },

  isHabitIntent(lower) {
    return lower.includes('hábito') || lower.includes('habito') || lower.includes('novo habito') || lower.includes('rotina diária');
  },

  isFinanceIntent(lower) {
    const moneyTriggers = ['gastei', 'comprei', 'paguei', 'despesa', 'custou', 'recebi', 'ganhei', 'salário', 'salario', 'renda', 'entrada de', 'saída de'];
    const hasCurrencyOrNumber = /\d+([.,]\d+)?/.test(lower) || lower.includes('reais') || lower.includes('r$');
    return moneyTriggers.some(m => lower.includes(m)) && hasCurrencyOrNumber;
  },

  isTasksQuery(lower) {
    return lower.includes('prioridade') || lower.includes('tarefas pendentes') || lower.includes('o que tenho pra fazer') || lower.includes('minhas tarefas') || lower.includes('lista de tarefas');
  },

  isFinancesQuery(lower) {
    return lower.includes('finança') || lower.includes('financas') || lower.includes('saldo') || lower.includes('gasto') || lower.includes('balanço') || lower.includes('balanco');
  },

  isHabitsQuery(lower) {
    return (lower.includes('hábito') || lower.includes('habitos')) && (lower.includes('hoje') || lower.includes('como está') || lower.includes('quais') || lower.includes('faltam') || lower.includes('status'));
  },

  isChallengeQuery(lower) {
    return lower.includes('desafio') || lower.includes('escape21') || lower.includes('score');
  },

  isAgendaQuery(lower) {
    return lower.includes('próximos compromissos') || lower.includes('agenda hoje') || lower.includes('o que tenho agendado') || lower.includes('eventos');
  },

  isReadingQuery(lower) {
    return lower.includes('leitura') || lower.includes('livro') || lower.includes('estante') || lower.includes('páginas lidas');
  },

  isDiaryQuery(lower) {
    return lower.includes('diário') || lower.includes('diario') || lower.includes('reflexão') || lower.includes('gratidão') || lower.includes('esperado');
  },

  isProductivityAdviceQuery(lower) {
    return lower.includes('organizar meu dia') || lower.includes('como organizar') || lower.includes('foco') || lower.includes('dica de produtividade') || lower.includes('me ajuda a focar');
  },

  // --- ACTION HANDLERS ---

  handleEventCreation(text, lower, db, now) {
    const { date, dateText } = this.extractDate(lower, now);
    const time = this.extractTime(lower) || '10:00';
    
    // Limpeza rigorosa do título do evento
    let cleanTitle = text
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
      .replace(/depois de amanhã/gi, '')
      .replace(/hoje/gi, '')
      .replace(/às \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/as \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/dia \d{1,2}(\/\d{1,2})?/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = 'Novo Compromisso';
    } else {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    const action = {
      type: 'create_event',
      data: {
        title: cleanTitle,
        date: date,
        time: time,
        description: 'Agendado pelo Krux Local IA'
      }
    };

    const reply = `🗓️ **Compromisso Agendado com Sucesso!**\n\nAdicionei **${cleanTitle}** na sua agenda para **${this.formatDateBR(date)} (${dateText})** às **${time}**.\n\nVocê pode visualizar ou editar na aba **Agenda**.`;

    return { reply, action, isLocalEngine: true };
  },

  handleTaskCreation(text, lower, db, now) {
    const { date, dateText } = this.extractDate(lower, now);
    const time = this.extractTime(lower);
    const priority = this.extractPriority(lower);

    let cleanTitle = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/tenho uma tarefa pra fazer/gi, '')
      .replace(/tenho uma tarefa para fazer/gi, '')
      .replace(/tenho uma tarefa/gi, '')
      .replace(/cria(r)? tarefa/gi, '')
      .replace(/adiciona(r)? tarefa/gi, '')
      .replace(/nova tarefa/gi, '')
      .replace(/marca lá/gi, '')
      .replace(/marca(r)?/gi, '')
      .replace(/urgente/gi, '')
      .replace(/alta prioridade/gi, '')
      .replace(/baixa prioridade/gi, '')
      .replace(/amanhã/gi, '')
      .replace(/amanha/gi, '')
      .replace(/hoje/gi, '')
      .replace(/até \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/às \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = 'Nova Tarefa';
    } else {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    const action = {
      type: 'create_task',
      data: {
        title: cleanTitle,
        priority: priority,
        dueDate: date,
        time: time || ''
      }
    };

    const priorityBadge = priority === 'alta' ? '🚨 Alta Prioridade' : priority === 'baixa' ? '☕ Baixa Prioridade' : '📋 Prioridade Normal';
    const dueInfo = time ? `com prazo para **${this.formatDateBR(date)} às ${time}**` : `para **${this.formatDateBR(date)} (${dateText})**`;

    const reply = `✅ **Tarefa Criada!**\n\nRegistrei a tarefa **"${cleanTitle}"** ${dueInfo} com **${priorityBadge}**.\n\nEla já está disponível na sua lista de **Tarefas** e no Dashboard.`;

    return { reply, action, isLocalEngine: true };
  },

  handleHabitCreation(text, lower, db, now) {
    let cleanTitle = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/cria(r)? hábito de/gi, '')
      .replace(/cria(r)? hábito/gi, '')
      .replace(/cria(r)? habito/gi, '')
      .replace(/adiciona(r)? hábito/gi, '')
      .replace(/adiciona(r)? habito/gi, '')
      .replace(/novo hábito/gi, '')
      .replace(/novo habito/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = 'Novo Hábito Saudável';
    } else {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    const action = {
      type: 'create_habit',
      data: {
        title: cleanTitle
      }
    };

    const reply = `🌱 **Novo Hábito Adicionado!**\n\nAdicionei **"${cleanTitle}"** à sua lista de hábitos diários. Comece hoje mesmo a construir sua sequência de consistência (streak)!`;

    return { reply, action, isLocalEngine: true };
  },

  handleFinanceCreation(text, lower, db, now) {
    const isIncome = lower.includes('recebi') || lower.includes('ganhei') || lower.includes('salário') || lower.includes('salario') || lower.includes('renda') || lower.includes('entrada');
    const type = isIncome ? 'income' : 'expense';
    const amount = this.extractAmount(lower) || 0;
    const today = now.toISOString().slice(0, 10);

    // Identificação de Categoria
    let category = 'Geral';
    if (lower.includes('almoço') || lower.includes('jantar') || lower.includes('mercado') || lower.includes('comida') || lower.includes('café') || lower.includes('lanche')) {
      category = 'Alimentação';
    } else if (lower.includes('uber') || lower.includes('gasolina') || lower.includes('combustível') || lower.includes('ônibus') || lower.includes('passagem')) {
      category = 'Transporte';
    } else if (lower.includes('aluguel') || lower.includes('luz') || lower.includes('água') || lower.includes('internet') || lower.includes('condomínio')) {
      category = 'Moradia';
    } else if (lower.includes('curso') || lower.includes('livro') || lower.includes('estudo')) {
      category = 'Educação';
    } else if (lower.includes('freela') || lower.includes('serviço') || lower.includes('venda') || lower.includes('salário')) {
      category = 'Trabalho';
    }

    let cleanDesc = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/gastei/gi, '')
      .replace(/comprei/gi, '')
      .replace(/paguei/gi, '')
      .replace(/recebi/gi, '')
      .replace(/ganhei/gi, '')
      .replace(/r\$\s*\d+([.,]\d+)?/gi, '')
      .replace(/\d+([.,]\d+)?\s*(reais)?/gi, '')
      .replace(/no |na |em |com |de /gi, ' ')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!cleanDesc || cleanDesc.length < 2) {
      cleanDesc = isIncome ? 'Recebimento' : 'Gasto registrado';
    } else {
      cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    }

    const action = {
      type: 'create_transaction',
      data: {
        type: type,
        amount: amount,
        description: cleanDesc,
        category: category,
        date: today
      }
    };

    const formattedVal = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    const sign = isIncome ? '+ ' : '- ';
    const typeLabel = isIncome ? 'Receita' : 'Despesa';

    const reply = `💳 **Transação Registrada!**\n\n• **Tipo:** ${typeLabel}\n• **Valor:** ${sign}${formattedVal}\n• **Descrição:** ${cleanDesc}\n• **Categoria:** ${category}\n\nO saldo do seu controle financeiro foi atualizado.`;

    return { reply, action, isLocalEngine: true };
  },

  handleChallengeCheckin(text, lower, db, todayStr) {
    const challenges = db.challenges || [];
    const ch = challenges[0];

    if (!ch) {
      return {
        reply: 'Você não tem nenhum desafio ativo no momento. Crie o desafio **Escape21** na aba Desafios para começar a acumular dias!',
        action: null,
        isLocalEngine: true
      };
    }

    const checkins = ch.checkins || [];
    const alreadyDone = checkins.includes(todayStr);

    if (alreadyDone) {
      const daysCount = checkins.length;
      return {
        reply: `🔥 Seu check-in de hoje já está registrado! Você já cumpriu **${daysCount} dias** no **${ch.title}** (${ch.progress || 0}% concluído). Continue com esse ritmo!`,
        action: null,
        isLocalEngine: true
      };
    }

    const action = {
      type: 'challenge_checkin',
      data: {
        challengeId: ch.id || 'escape21',
        date: todayStr
      }
    };

    const newTotal = checkins.length + 1;
    const reply = `🔥 **Check-in Registrado com Sucesso!**\n\nParabéns! Hoje você cumpriu mais um dia no **${ch.title}**.\nSeu Score do Desafio subiu para **${newTotal} dias concluídos**!`;

    return { reply, action, isLocalEngine: true };
  },

  // --- QUERY HANDLERS ---

  handleTasksSummary(db) {
    const tasks = db.tasks || [];
    const pending = tasks.filter(t => !t.completed);
    const high = pending.filter(t => t.priority === 'alta');
    const normal = pending.filter(t => t.priority === 'normal' || t.priority === 'media');
    const low = pending.filter(t => t.priority === 'baixa');

    if (pending.length === 0) {
      return {
        reply: '🎉 **Parabéns! Todas as suas tarefas estão concluídas.**\n\nNenhuma pendência no Nodus no momento. Se quiser, me peça para criar uma nova tarefa quando surgir!',
        action: null,
        isLocalEngine: true
      };
    }

    let msg = `📋 **Visão Geral das suas Tarefas (${pending.length} pendentes):**\n\n`;
    if (high.length > 0) {
      msg += `🚨 **Foco Imediato (Alta Prioridade - ${high.length}):**\n` + high.map(t => `• **${t.title}**`).join('\n') + '\n\n';
    }
    if (normal.length > 0) {
      msg += `📌 **Prioridade Normal (${normal.length}):**\n` + normal.map(t => `• ${t.title}`).join('\n') + '\n\n';
    }
    if (low.length > 0) {
      msg += `☕ **Baixa Prioridade (${low.length}):**\n` + low.map(t => `• ${t.title}`).join('\n') + '\n\n';
    }

    msg += `*Dica do Krux: Conclua primeiro a principal tarefa de alta prioridade antes de abrir novas frentes.*`;

    return { reply: msg, action: null, isLocalEngine: true };
  },

  handleFinancesSummary(db) {
    const transactions = db.finances?.transactions || [];
    let inc = 0;
    let exp = 0;

    transactions.forEach(t => {
      const v = Number(t.amount) || 0;
      if (t.type === 'income') inc += v;
      else exp += v;
    });

    const bal = inc - exp;
    const format = (v) => `R$ ${Math.abs(v).toFixed(2).replace('.', ',')}`;

    let msg = `💰 **Balanço Financeiro Nodus:**\n\n`;
    msg += `• **Receitas Totais:** + ${format(inc)}\n`;
    msg += `• **Despesas Totais:** - ${format(exp)}\n`;
    msg += `• **Saldo Líquido:** ${bal >= 0 ? '+' : '-'} ${format(bal)}\n\n`;

    if (transactions.length > 0) {
      msg += `**Últimos Lançamentos:**\n`;
      transactions.slice(0, 4).forEach(t => {
        const sign = t.type === 'income' ? '+' : '-';
        msg += `• ${t.description} (${sign} ${format(t.amount)})\n`;
      });
    }

    return { reply: msg, action: null, isLocalEngine: true };
  },

  handleHabitsSummary(db, todayStr) {
    const habits = db.habits || [];
    if (habits.length === 0) {
      return {
        reply: 'Você ainda não cadastrou nenhum hábito. Me diga: *"Krux, cria o hábito de beber 2L de água"* para registrar o primeiro!',
        action: null,
        isLocalEngine: true
      };
    }

    const done = habits.filter(h => (h.completedDates || []).includes(todayStr));
    const pending = habits.filter(h => !(h.completedDates || []).includes(todayStr));

    let msg = `⚡ **Seus Hábitos Diários (${done.length}/${habits.length} concluídos hoje):**\n\n`;
    if (done.length > 0) {
      msg += `✅ **Já feitos hoje:**\n` + done.map(h => `• **${h.title}** (streak: ${h.streak || 0}d)`).join('\n') + '\n\n';
    }
    if (pending.length > 0) {
      msg += `⏳ **Ainda pendentes:**\n` + pending.map(h => `• ${h.title} (sequência: ${h.streak || 0}d)`).join('\n') + '\n\n';
    }

    msg += done.length === habits.length ? '🌟 Todos os hábitos de hoje cumpridos com sucesso!' : 'Mantenha o compromisso para não quebrar a sequência!';

    return { reply: msg, action: null, isLocalEngine: true };
  },

  handleChallengeSummary(db, todayStr) {
    const ch = (db.challenges || [])[0];
    if (!ch) {
      return {
        reply: 'Nenhum desafio ativo no momento. Visite a aba **Desafios** para iniciar!',
        action: null,
        isLocalEngine: true
      };
    }

    const checkins = ch.checkins || [];
    const daysCompleted = checkins.length;
    const hasToday = checkins.includes(todayStr);

    let msg = `🔥 **Status do ${ch.title || 'Desafio'}:**\n\n`;
    msg += `• **Score do Desafio:** **${daysCompleted} dias cumpridos** de ${ch.daysTotal || 21}\n`;
    msg += `• **Dias Restantes:** ${ch.daysRemaining ?? Math.max(0, (ch.daysTotal || 21) - daysCompleted)} dias\n`;
    msg += `• **Progresso:** ${ch.progress || Math.round((daysCompleted / (ch.daysTotal || 21)) * 100)}%\n`;
    msg += `• **Check-in de Hoje:** ${hasToday ? '✅ Concluído' : '⏳ Pendente (diga *"marca meu check-in de hoje"* para registrar)'}\n`;

    return { reply: msg, action: null, isLocalEngine: true };
  },

  handleAgendaSummary(db, todayStr) {
    const events = db.events || [];
    if (events.length === 0) {
      return {
        reply: '📅 Sua agenda está livre no momento! Diga *"Krux, marca reunião amanhã às 15h"* para agendar algo.',
        action: null,
        isLocalEngine: true
      };
    }

    const sorted = [...events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    let msg = `📅 **Próximos Compromissos na sua Agenda:**\n\n`;
    sorted.slice(0, 5).forEach(e => {
      const isToday = e.date === todayStr;
      const dateTag = isToday ? 'HOJE' : this.formatDateBR(e.date);
      msg += `• **${dateTag} às ${e.time}**: ${e.title}\n`;
    });

    return { reply: msg, action: null, isLocalEngine: true };
  },

  handleReadingSummary(db) {
    const books = db.reading || [];
    if (books.length === 0) {
      return {
        reply: 'Sua estante de leitura está vazia. Adicione livros na aba **Leitura** para registrar suas páginas diárias.',
        action: null,
        isLocalEngine: true
      };
    }

    const totalPages = books.reduce((acc, b) => acc + (b.currentPage || 0), 0);
    let msg = `📚 **Progresso de Leitura:**\n\n• **Páginas acumuladas:** ${totalPages} pág\n• **Livros cadastrados:** ${books.length}\n\n`;
    books.forEach(b => {
      const pct = b.totalPages ? Math.round(((b.currentPage || 0) / b.totalPages) * 100) : 0;
      msg += `• *${b.title}* (${b.author || 'Autor'}): ${b.currentPage || 0}/${b.totalPages || 0} pág (${pct}%)\n`;
    });

    return { reply: msg, action: null, isLocalEngine: true };
  },

  handleDiarySummary(db, todayStr) {
    const diary = db.diary || [];
    const todayEntry = diary.find(d => d.date === todayStr);

    if (todayEntry) {
      let msg = `📖 **Seu Diário de Hoje (${this.formatDateBR(todayStr)}):**\n\n`;
      if (todayEntry.expected) msg += `🌅 **O que espera do dia:** "${todayEntry.expected}"\n\n`;
      if (todayEntry.grateful) msg += `🙏 **Gratidão:** "${todayEntry.grateful}"\n\n`;
      if (todayEntry.content) msg += `✍️ **Registro:** "${todayEntry.content}"\n\n`;
      return { reply: msg, action: null, isLocalEngine: true };
    }

    return {
      reply: `📖 Você ainda não registrou o diário de hoje. Preencha seu **Plano do Dia** na Home ou abra a aba **Diário** para expressar sua intenção e gratidão!`,
      action: null,
      isLocalEngine: true
    };
  },

  handleProductivityAdvice(db, todayStr) {
    const tasks = db.tasks || [];
    const pending = tasks.filter(t => !t.completed);
    const high = pending.filter(t => t.priority === 'alta');
    const mainTask = db.dailyPlan?.mainTask;
    const habits = db.habits || [];
    const pendingHabits = habits.filter(h => !(h.completedDates || []).includes(todayStr));

    let advice = `🧠 **Estratégia de Foco do Krux para Hoje:**\n\n`;
    if (mainTask) {
      advice += `1. **Foco Único:** Sua principal meta declarada é *"**${mainTask}**"*. Dedique seu primeiro bloco de foco profundo (deep work) a ela.\n`;
    } else if (high[0]) {
      advice += `1. **Prioridade Máxima:** Ataque primeiro a tarefa *"**${high[0].title}**"*, que está com alta prioridade.\n`;
    } else {
      advice += `1. **Defina seu Foco:** Defina 1 única prioridade essencial para considerar o dia vitorioso.\n`;
    }

    if (pendingHabits.length > 0) {
      advice += `2. **Ritmo de Hábitos:** Você tem ${pendingHabits.length} hábitos pendentes (ex: *${pendingHabits[0].title}*). Encaixe-os em transições de tarefas.\n`;
    }

    advice += `3. **Elimine Ruídos:** Trabalhe em blocos de 25 a 50 minutos com notificações silenciadas.\n\nPrecisa que eu agende algum compromisso ou crie um bloco de foco na sua agenda?`;

    return { reply: advice, action: null, isLocalEngine: true };
  },

  handleGeneralContextual(text, db, todayStr) {
    const userName = db.settings?.user?.name ? db.settings.user.name.split(' ')[0] : 'Produtivo';
    const pendingTasks = (db.tasks || []).filter(t => !t.completed).length;
    const ch = (db.challenges || [])[0];
    const daysScore = (ch?.checkins || []).length;

    return {
      reply: `Olá, **${userName}**! Sou o **Krux**, seu assistente de produtividade local e mentor no Nodus.\n\n` +
             `Aqui está seu panorama rápido:\n` +
             `• **Tarefas pendentes:** ${pendingTasks}\n` +
             `• **Score do Desafio:** ${daysScore} dias cumpridos\n\n` +
             `Você pode me pedir diretamente:\n` +
             `• *"Krux, marca reunião amanhã às 15h"*\n` +
             `• *"Tenho uma tarefa pra amanhã às 16h: finalizar proposta"*\n` +
             `• *"Gastei 50 no almoço"*\n` +
             `• *"Como está meu desafio?"* ou *"Marca meu check-in de hoje"*`,
      action: null,
      isLocalEngine: true
    };
  },

  // --- ENTITY EXTRACTORS ---

  extractDate(text, now) {
    const lower = text.toLowerCase();
    const today = new Date(now.getTime());
    
    if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
      const target = new Date(today.getTime() + 86400000 * 2);
      return { date: target.toISOString().slice(0, 10), dateText: 'depois de amanhã' };
    }

    if (lower.includes('amanhã') || lower.includes('amanha')) {
      const target = new Date(today.getTime() + 86400000);
      return { date: target.toISOString().slice(0, 10), dateText: 'amanhã' };
    }

    if (lower.includes('hoje')) {
      return { date: today.toISOString().slice(0, 10), dateText: 'hoje' };
    }

    // Dias da semana (segunda, terça, etc.)
    const weekdays = [
      { name: 'domingo', day: 0 },
      { name: 'segunda', day: 1 },
      { name: 'terça', day: 2 },
      { name: 'terca', day: 2 },
      { name: 'quarta', day: 3 },
      { name: 'quinta', day: 4 },
      { name: 'sexta', day: 5 },
      { name: 'sábado', day: 6 },
      { name: 'sabado', day: 6 }
    ];

    for (const w of weekdays) {
      if (lower.includes(w.name)) {
        const currentDay = today.getDay();
        let diff = w.day - currentDay;
        if (diff <= 0) diff += 7; // Próxima ocorrência
        const target = new Date(today.getTime() + 86400000 * diff);
        return { date: target.toISOString().slice(0, 10), dateText: `próxima ${w.name}` };
      }
    }

    // Data numérica no formato dd/mm ou dia dd
    const matchSlash = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (matchSlash) {
      const d = parseInt(matchSlash[1], 10);
      const m = parseInt(matchSlash[2], 10) - 1;
      const y = matchSlash[3] ? parseInt(matchSlash[3], 10) : today.getFullYear();
      const target = new Date(y, m, d);
      return { date: target.toISOString().slice(0, 10), dateText: `${d}/${m + 1}` };
    }

    const matchDia = lower.match(/\bdia\s*(\d{1,2})\b/);
    if (matchDia) {
      const d = parseInt(matchDia[1], 10);
      const target = new Date(today.getFullYear(), today.getMonth(), d);
      if (target.getTime() < today.getTime() - 86400000) {
        target.setMonth(target.getMonth() + 1);
      }
      return { date: target.toISOString().slice(0, 10), dateText: `dia ${d}` };
    }

    // Padrão hoje
    return { date: today.toISOString().slice(0, 10), dateText: 'hoje' };
  },

  extractTime(text) {
    const lower = text.toLowerCase();
    
    // Padrão HH:MM (ex: 15:30, 09:00)
    const matchColon = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (matchColon) {
      const h = matchColon[1].padStart(2, '0');
      const m = matchColon[2];
      return `${h}:${m}`;
    }

    // Padrão HHh ou HHhrs ou às HH (ex: 15h, 16hrs, às 14, às 9)
    const matchHour = lower.match(/(?:às|as|até|ate)?\s*\b([01]?\d|2[0-3])\s*(?:h|hrs|horas)?\b/);
    if (matchHour && (lower.includes('h') || lower.includes('às') || lower.includes('as ') || lower.includes('até'))) {
      const h = parseInt(matchHour[1], 10);
      if (h >= 0 && h <= 23) {
        return `${h.toString().padStart(2, '0')}:00`;
      }
    }

    return null;
  },

  extractPriority(text) {
    const lower = text.toLowerCase();
    if (lower.includes('urgente') || lower.includes('alta prioridade') || lower.includes('crítica') || lower.includes('critica') || lower.includes('importante')) {
      return 'alta';
    }
    if (lower.includes('baixa prioridade') || lower.includes('baixa') || lower.includes('quando der') || lower.includes('depois')) {
      return 'baixa';
    }
    return 'alta'; // Padrão recomendado para tarefas ditadas diretamente ao assistente
  },

  extractAmount(text) {
    // Procura por R$ 50,00 ou 50 reais ou apenas 50
    const matchR = text.match(/r\$\s*(\d+(?:[.,]\d+)?)/i);
    if (matchR) {
      return parseFloat(matchR[1].replace(',', '.'));
    }

    const matchReais = text.match(/(\d+(?:[.,]\d+)?)\s*(?:reais|real)/i);
    if (matchReais) {
      return parseFloat(matchReais[1].replace(',', '.'));
    }

    const matchNum = text.match(/\b(\d+(?:[.,]\d+)?)\b/);
    if (matchNum) {
      return parseFloat(matchNum[1].replace(',', '.'));
    }

    return 0;
  },

  formatDateBR(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  }
};
