import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

app.use(express.json({ limit: "15mb" }));

// Estrutura inicial limpa para novos usuários
const INITIAL_CLEAN_DB = {
  tasks: [],
  habits: [],
  events: [],
  notes: [],
  finances: { transactions: [] },
  challenges: [],
  workouts: [],
  content: [],
  reading: [],
  diary: [],
  dailyPlan: { expectedOfDay: "", mainTask: "", gratitude: "" },
  settings: {
    theme: "dark",
    accentColor: "orange",
    user: { name: "", username: "", email: "" },
    koreProactive: true,
    morningBriefing: "07:00",
    nightSummary: true,
    timezone: "America/Sao_Paulo",
    menuItems: {
      habits: true,
      workouts: true,
      content: true,
      notes: true,
      reading: true,
      diary: true
    }
  }
};

// GET /api/db — lê dados do db.json
app.get("/api/db", (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_CLEAN_DB, null, 2), "utf-8");
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return res.json(JSON.parse(data));
  } catch (err: any) {
    console.error("Erro ao ler db.json:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/db — grava dados em db.json
app.post("/api/db", (req, res) => {
  try {
    const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body, null, 2);
    fs.writeFileSync(DB_PATH, payload, "utf-8");
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao gravar db.json:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Inicialização Preguiçosa do SDK Gemini
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// POST /api/krux/chat & /api/kore/chat — IA Krux conectada aos dados do Nodus
async function handleKruxChat(req: express.Request, res: express.Response) {
  try {
    const { message, history, forceLocal } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    // Carrega dados completos e atualizados da aplicação
    let appData: any = {};
    if (fs.existsSync(DB_PATH)) {
      try {
        appData = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      } catch (e) {
        console.warn("Falha ao parsear db.json para Krux:", e);
      }
    }

    // 1. Processamento Local Instantâneo via Krux Engine
    const localResult = executeKruxLocalEngine(message, appData);

    // Se o usuário forçou local ou se for uma ação/comando direto com alta confiança, retorna o local imediatamente
    if (forceLocal || (localResult.action && localResult.isConfidentAction)) {
      if (localResult.action) {
        applyKruxActionToDatabase(localResult.action, appData);
        fs.writeFileSync(DB_PATH, JSON.stringify(appData, null, 2), "utf-8");
      }
      return res.json({
        reply: localResult.reply,
        action: localResult.action,
        model: "krux-local-engine",
        isLocal: true
      });
    }

    const userName = appData.settings?.user?.name || "Usuário";
    const tasks = appData.tasks || [];
    const pendingTasks = tasks.filter((t: any) => !t.completed);
    const completedTasks = tasks.filter((t: any) => t.completed);
    const highPriorityTasks = pendingTasks.filter((t: any) => t.priority === "alta");
    const habits = appData.habits || [];
    const events = appData.events || [];
    const finances = appData.finances?.transactions || [];
    const challenges = appData.challenges || [];
    const workouts = appData.workouts || [];
    const reading = appData.reading || [];
    const diary = appData.diary || [];
    const dailyPlan = appData.dailyPlan || {};

    let totalIncome = 0;
    let totalExpense = 0;
    finances.forEach((tx: any) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") totalIncome += amt;
      else totalExpense += amt;
    });
    const currentBalance = totalIncome - totalExpense;
    const totalPagesRead = reading.reduce((acc: number, b: any) => acc + (b.currentPage || 0), 0);

    const todayObj = new Date();
    const todayStr = todayObj.toISOString().slice(0, 10);
    const tomorrowObj = new Date(todayObj.getTime() + 86400000);
    const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);
    const dayOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][todayObj.getDay()];

    const appContextSummary = `
DADOS DO USUÁRIO E DO APLICATIVO NODUS:
- Data Atual do Sistema: ${todayStr} (${dayOfWeek})
- Amanhã: ${tomorrowStr}
- Nome do Usuário: ${userName}
- Plano do Dia Atual:
  • O que espera do dia: "${dailyPlan.expectedOfDay || "Não preenchido"}"
  • Principal tarefa: "${dailyPlan.mainTask || "Não definida"}"
  • Gratidão: "${dailyPlan.gratitude || "Não preenchido"}"
- Tarefas:
  • Total pendentes: ${pendingTasks.length}
  • Alta prioridade pendentes: ${highPriorityTasks.map((t: any) => t.title).join(", ") || "Nenhuma"}
  • Todas pendentes: ${pendingTasks.map((t: any) => `[${t.priority}] ${t.title}`).join("; ") || "Nenhuma"}
  • Concluídas recentemente: ${completedTasks.slice(0, 5).map((t: any) => t.title).join(", ") || "Nenhuma"}
- Hábitos:
  • Cadastrados: ${habits.map((h: any) => `${h.title} (streak: ${h.streak || 0} dias)`).join("; ") || "Nenhum"}
- Próximos Compromissos na Agenda:
  • ${events.map((e: any) => `${e.date} às ${e.time}: ${e.title}`).join("; ") || "Nenhum compromisso agendado"}
- Finanças:
  • Total Receitas: R$ ${totalIncome.toFixed(2)}
  • Total Despesas: R$ ${totalExpense.toFixed(2)}
  • Saldo Atual: R$ ${currentBalance.toFixed(2)}
  • Últimos lançamentos: ${finances.slice(0, 4).map((f: any) => `${f.description} (R$ ${f.amount} - ${f.type})`).join("; ") || "Nenhum"}
- Desafios Ativos:
  • ${challenges.map((c: any) => `${c.title || "Desafio"}: ${(c.checkins || []).length} dias cumpridos, ${c.daysRemaining || 0} dias restantes, ${c.progress || 0}% concluído`).join("; ") || "Nenhum"}
- Treinos:
  • Divisões: ${workouts.map((w: any) => `${w.title} (${(w.exercises || []).length} exercícios)`).join("; ") || "Nenhum"}
- Leitura:
  • Total de páginas lidas acumuladas: ${totalPagesRead}
  • Livros: ${reading.map((b: any) => `${b.title} (${b.currentPage || 0}/${b.totalPages || 0} pág)`).join("; ") || "Nenhum"}
- Diário Recente:
  • Registros salvos: ${diary.length}
  • Último registro: ${diary[0] ? `Data ${diary[0].date}: Esperado "${diary[0].expected || ""}", Grato "${diary[0].grateful || ""}"` : "Nenhum"}
`;

    const systemPrompt = `Você é o Krux, o assistente inteligente, ativo e mentor de produtividade do aplicativo Nodus.
Você NÃO é apenas um chatbot que fala, você EXECUTA tarefas reais no aplicativo do usuário quando ele pedir!
Você tem acesso em tempo real a todo o banco de dados do Nodus fornecido abaixo.

Data de hoje: ${todayStr} (${dayOfWeek}). Amanhã é: ${tomorrowStr}.

EXECUÇÃO DE AÇÕES NO NODUS:
Se o usuário pedir para marcar compromisso, criar tarefa, adicionar hábito, registrar gasto/ganho, fazer check-in ou definir meta:
1. Responda em português brasileiro de forma acolhedora, objetiva e confirmando claramente o que foi feito.
2. No final da resposta, adicione OBRIGATORIAMENTE um bloco de ação com o JSON correspondente:

Para AGENDAR NA AGENDA:
\`\`\`action
{
  "type": "create_event",
  "data": {
    "title": "Título do compromisso",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "description": "Detalhes opcionais"
  }
}
\`\`\`

Para CRIAR TAREFA:
\`\`\`action
{
  "type": "create_task",
  "data": {
    "title": "Título da tarefa",
    "priority": "alta" | "normal" | "baixa",
    "dueDate": "YYYY-MM-DD",
    "time": "HH:MM"
  }
}
\`\`\`

Para CRIAR HÁBITO:
\`\`\`action
{
  "type": "create_habit",
  "data": {
    "title": "Nome do hábito"
  }
}
\`\`\`

Para REGISTRAR FINANÇA:
\`\`\`action
{
  "type": "create_transaction",
  "data": {
    "type": "expense" | "income",
    "amount": 50.0,
    "description": "Descrição",
    "category": "Geral"
  }
}
\`\`\`

Para CHECK-IN NO DESAFIO:
\`\`\`action
{
  "type": "challenge_checkin",
  "data": {
    "challengeId": "escape21",
    "date": "YYYY-MM-DD"
  }
}
\`\`\`

Se o usuário apenas fizer perguntas, analisar dados ou pedir conselhos, responda sem o bloco de ação.
Seja rápido, direto e prático.

${appContextSummary}
`;

    let rawReply = "";
    const ai = getGemini();

    if (ai) {
      const candidateModels = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `${systemPrompt}\n\nPERGUNTA/MENSAGEM DO USUÁRIO:\n${message}`
          });
          if (response && response.text) {
            rawReply = response.text;
            break;
          }
        } catch (err: any) {
          console.warn(`Tentativa Krux com ${modelName} falhou, tentando próximo...`, err?.message || err);
        }
      }
    }

    // Se a IA externa falhar ou não houver chave, usa o motor local completo
    if (!rawReply) {
      if (localResult.action) {
        applyKruxActionToDatabase(localResult.action, appData);
        fs.writeFileSync(DB_PATH, JSON.stringify(appData, null, 2), "utf-8");
      }
      return res.json({
        reply: localResult.reply,
        action: localResult.action,
        model: "krux-local-engine",
        isLocal: true
      });
    }

    // Processa bloco de ação (se houver) e aplica no banco
    const actionMatch = rawReply.match(/```action\s*([\s\S]*?)\s*```/);
    let executedAction: any = null;
    let cleanReply = rawReply;

    if (actionMatch) {
      try {
        executedAction = JSON.parse(actionMatch[1]);
        cleanReply = rawReply.replace(/```action\s*([\s\S]*?)\s*```/, "").trim();
        
        applyKruxActionToDatabase(executedAction, appData);
        fs.writeFileSync(DB_PATH, JSON.stringify(appData, null, 2), "utf-8");
      } catch (actErr) {
        console.error("Erro ao executar ação recebida pelo Krux:", actErr);
      }
    }

    return res.json({ reply: cleanReply, action: executedAction, model: "gemini", isLocal: false });

  } catch (err: any) {
    console.error("Erro na rota /api/krux/chat:", err);
    return res.status(500).json({ error: "Erro interno no Krux" });
  }
}

app.post("/api/krux/chat", handleKruxChat);
app.post("/api/kore/chat", handleKruxChat);

function applyKruxActionToDatabase(action: { type: string; data: any }, db: any) {
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
        id: "escape21",
        title: "Escape21",
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

function executeKruxLocalEngine(query: string, data: any): { reply: string; action: any; isConfidentAction: boolean } {
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
    
    // Extrai hora ex: 15h, 15:30, às 14
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
      .replace(/marca lá/gi, '')
      .replace(/marca(r)?/gi, '')
      .replace(/urgente/gi, '')
      .replace(/alta prioridade/gi, '')
      .replace(/amanhã/gi, '')
      .replace(/amanha/gi, '')
      .replace(/até \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
      .replace(/às \d{1,2}(:\d{2})?\s*(?:horas|hrs|hr|h)?/gi, '')
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
      reply: `✅ **Tarefa Registrada!**\n\nCriei a tarefa **"${title}"** com prioridade **${priority.toUpperCase()}** para **${targetDate === today ? 'hoje' : 'amanhã'}**${targetTime ? ` às ${targetTime}` : ''}.`,
      action,
      isConfidentAction: true
    };
  }

  // 3. Finança
  const isFinance = (lower.includes("gastei") || lower.includes("comprei") || lower.includes("paguei") || lower.includes("recebi") || lower.includes("ganhei")) && (/\d+/.test(lower));
  if (isFinance) {
    const isIncome = lower.includes("recebi") || lower.includes("ganhei") || lower.includes("salário");
    let amount = 0;
    const matchNum = lower.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/);
    if (matchNum) amount = parseFloat(matchNum[1].replace(',', '.'));

    let desc = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/gastei/gi, '')
      .replace(/comprei/gi, '')
      .replace(/paguei/gi, '')
      .replace(/recebi/gi, '')
      .replace(/r\$\s*\d+([.,]\d+)?/gi, '')
      .replace(/\d+([.,]\d+)?\s*(reais)?/gi, '')
      .replace(/no |na |em |com |de /gi, ' ')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();

    if (!desc || desc.length < 2) desc = isIncome ? "Receita" : "Despesa";
    else desc = desc.charAt(0).toUpperCase() + desc.slice(1);

    const action = {
      type: "create_transaction",
      data: {
        type: isIncome ? "income" : "expense",
        amount,
        description: desc,
        category: "Geral",
        date: today
      }
    };

    return {
      reply: `💳 **Transação Financeira Registrada!**\n\n• **${isIncome ? 'Receita' : 'Despesa'}:** R$ ${amount.toFixed(2).replace('.', ',')}\n• **Descrição:** ${desc}\n\nSaldo do Nodus atualizado!`,
      action,
      isConfidentAction: true
    };
  }

  // 4. Hábito
  if (lower.includes("hábito") && (lower.includes("cria") || lower.includes("adiciona") || lower.includes("novo"))) {
    let title = text
      .replace(/krux/gi, '')
      .replace(/kore/gi, '')
      .replace(/cria(r)? hábito de/gi, '')
      .replace(/cria(r)? hábito/gi, '')
      .replace(/adiciona(r)? hábito/gi, '')
      .replace(/novo hábito/gi, '')
      .replace(/^[:\-–—,;.\s]+/, '')
      .replace(/[:\-–—,;.\s]+$/, '')
      .trim();
    if (!title) title = "Novo Hábito";

    return {
      reply: `🌱 **Novo Hábito Adicionado!**\n\nCadastrei **"${title}"** na sua lista de hábitos. Comece hoje a marcar sua sequência diária!`,
      action: { type: "create_habit", data: { title } },
      isConfidentAction: true
    };
  }

  // 5. Check-in do Desafio
  if (lower.includes("check-in") || lower.includes("checkin") || (lower.includes("marca") && lower.includes("desafio"))) {
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
      action: { type: "challenge_checkin", data: { challengeId: ch?.id || "escape21", date: today } },
      isConfidentAction: true
    };
  }

  // Resumos e consultas
  const tasks = data.tasks || [];
  const pending = tasks.filter((t: any) => !t.completed);
  const high = pending.filter((t: any) => t.priority === "alta");
  const finances = data.finances?.transactions || [];
  const habits = data.habits || [];
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

// Inicialização do Servidor com Middleware do Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nodus server rodando na porta ${PORT}`);
  });
}

startServer();
