/**
 * Nodus — API Routes
 * 
 * Rotas backend da API Express para persistência e inteligência artificial Krux.
 */
import express from "express";
import fs from "fs";
import path from "path";
import { executeKruxLocalEngine, applyKruxActionToDatabase } from "../services/kruxEngine.js";
import { generateGeminiReply } from "../services/geminiService.js";

export const apiRouter = express.Router();

const DB_PATH = path.join(process.cwd(), "db.json");

// Estrutura inicial limpa para novos usuários
export const INITIAL_CLEAN_DB = {
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

/**
 * Health check
 */
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", app: "Nodus", timestamp: new Date().toISOString() });
});

/**
 * GET /api/db — lê dados do db.json
 */
apiRouter.get("/db", (req, res) => {
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

/**
 * POST /api/db — grava dados em db.json
 */
apiRouter.post("/db", (req, res) => {
  try {
    const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body, null, 2);
    fs.writeFileSync(DB_PATH, payload, "utf-8");
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao gravar db.json:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Handler do chat Krux AI
 */
async function handleKruxChat(req: express.Request, res: express.Response) {
  try {
    const { message, forceLocal } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    // Carrega dados da aplicação
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

    // Se o usuário forçou local ou se for uma ação direta com alta confiança, retorna local imediatamente
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
    "challengeId": "nodus21",
    "date": "YYYY-MM-DD"
  }
}
\`\`\`

Se o usuário apenas fizer perguntas, analisar dados ou pedir conselhos, responda sem o bloco de ação.
Seja rápido, direto e prático.

${appContextSummary}
`;

    // 2. Processamento via Gemini (se disponível)
    const rawReply = await generateGeminiReply(systemPrompt, message);

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

apiRouter.post("/krux/chat", handleKruxChat);
apiRouter.post("/kore/chat", handleKruxChat);
