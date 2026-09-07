/**
 * Serviço de armazenamento para db.json
 * Suporta modo Desktop Nativo (Tauri invoke) e modo Web (API local / localStorage)
 * Garante persistência resiliente, integridade referencial e notificação de eventos
 */
import { normalizePriority } from '../utils/priority.js';

const STORAGE_KEY = 'produtividade_db';

const defaultData = {
  tasks: [],
  habits: [],
  events: [],
  notes: [],
  finances: {
    transactions: []
  },
  challenges: [],
  workouts: [],
  content: [],
  reading: [],
  diary: [],
  dailyPlan: {
    expectedOfDay: '',
    mainTask: '',
    gratitude: ''
  },
  settings: {
    theme: 'dark',
    accentColor: 'padrao',
    user: {
      name: '',
      username: '',
      email: ''
    },
    koreProactive: true,
    morningBriefing: '07:00',
    nightSummary: true,
    timezone: 'São Paulo',
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

let cachedData = null;
const listeners = new Set();

/**
 * Detecta se a aplicação está executando no ambiente desktop Tauri
 */
function isTauriEnvironment() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

/**
 * Invoca comandos Tauri de forma segura
 */
async function invokeTauri(command, args = {}) {
  try {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__?.invoke) {
      return await window.__TAURI_INTERNALS__.invoke(command, args);
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke(command, args);
  } catch (err) {
    console.warn(`[Tauri] Falha ao invocar ${command}:`, err);
    return null;
  }
}

export const StorageService = {
  /**
   * Notifica todos os ouvintes registrados
   */
  notify(meta = {}) {
    listeners.forEach(callback => {
      try {
        callback(cachedData, meta);
      } catch (err) {
        console.error('Erro no ouvinte de dados:', err);
      }
    });
  },

  /**
   * Inscreve um ouvinte para alterações no banco de dados
   */
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /**
   * Lê todos os dados de db.json
   * Prioridade: 1. Tauri Native -> 2. Web API (/api/db) -> 3. localStorage fallback
   */
  async loadData() {
    // 1. Tenta carregar via Tauri se estiver em ambiente Desktop
    if (isTauriEnvironment()) {
      try {
        const tauriResult = await invokeTauri('read_db');
        if (tauriResult) {
          const parsed = typeof tauriResult === 'string' ? JSON.parse(tauriResult) : tauriResult;
          this.setCache(parsed);
          return cachedData;
        }
      } catch (err) {
        console.warn('Falha na leitura nativa Tauri, tentando fallback HTTP:', err);
      }
    }

    // 2. Tenta carregar via Web API (/api/db)
    try {
      const response = await fetch('/api/db');
      if (response.ok) {
        const data = await response.json();
        this.setCache(data);
        return cachedData;
      }
    } catch (e) {
      console.warn('API /api/db não respondeu, usando fallback local:', e.message);
    }

    // 3. Fallback: localStorage
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        this.setCache(parsed);
        return cachedData;
      }
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }

    // Se nenhum existir, inicializa dados padrão
    this.setCache(defaultData);
    return cachedData;
  },

  /**
   * Normaliza e atualiza o cache em memória e localStorage
   */
  setCache(data) {
    if (!data || typeof data !== 'object') {
      data = defaultData;
    }
    cachedData = {
      tasks: (Array.isArray(data.tasks) ? data.tasks : []).map(task => ({
        ...task,
        priority: normalizePriority(task.priority),
        category: task.category || 'pessoal',
        status: task.status || (task.completed ? 'completed' : 'todo')
      })),
      habits: Array.isArray(data.habits) ? data.habits : [],
      events: Array.isArray(data.events) ? data.events : [],
      notes: Array.isArray(data.notes) ? data.notes : [],
      finances: (data.finances && typeof data.finances === 'object') ? {
        transactions: Array.isArray(data.finances.transactions) ? data.finances.transactions : []
      } : { transactions: [] },
      challenges: Array.isArray(data.challenges) ? data.challenges : [],
      workouts: Array.isArray(data.workouts) ? data.workouts : [],
      content: Array.isArray(data.content) ? data.content : [],
      reading: Array.isArray(data.reading) ? data.reading : [],
      diary: Array.isArray(data.diary) ? data.diary : [],
      dailyPlan: (data.dailyPlan && typeof data.dailyPlan === 'object') ? {
        expectedOfDay: data.dailyPlan.expectedOfDay || '',
        mainTask: data.dailyPlan.mainTask || '',
        gratitude: data.dailyPlan.gratitude || ''
      } : { expectedOfDay: '', mainTask: '', gratitude: '' },
      settings: (data.settings && typeof data.settings === 'object') ? {
        ...defaultData.settings,
        ...data.settings,
        user: {
          ...defaultData.settings.user,
          ...(data.settings.user || {})
        },
        menuItems: {
          ...defaultData.settings.menuItems,
          ...(data.settings.menuItems || {})
        }
      } : defaultData.settings
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
    } catch (err) {
      console.error('Erro ao espelhar no localStorage:', err);
    }
  },

  /**
   * Retorna os dados em memória de forma síncrona
   */
  getData() {
    if (!cachedData) {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          this.setCache(JSON.parse(local));
          return cachedData;
        }
      } catch (e) {}
      this.setCache(defaultData);
    }
    return cachedData;
  },

  /**
   * Salva os dados de forma permanente:
   * - Atualiza memória e localStorage
   * - Envia para Tauri se aplicável
   * - Envia para /api/db (escreve no db.json do sistema de arquivos)
   */
  async saveData(newData, meta = {}) {
    // Garante que nenhuma seção seja apagada por dados parciais
    const current = this.getData();
    cachedData = {
      tasks: Array.isArray(newData.tasks) ? newData.tasks : current.tasks,
      habits: Array.isArray(newData.habits) ? newData.habits : current.habits,
      events: Array.isArray(newData.events) ? newData.events : current.events,
      notes: Array.isArray(newData.notes) ? newData.notes : current.notes,
      finances: newData.finances && typeof newData.finances === 'object' ? newData.finances : current.finances,
      challenges: Array.isArray(newData.challenges) ? newData.challenges : current.challenges,
      workouts: Array.isArray(newData.workouts) ? newData.workouts : current.workouts,
      content: Array.isArray(newData.content) ? newData.content : current.content,
      reading: Array.isArray(newData.reading) ? newData.reading : current.reading,
      diary: Array.isArray(newData.diary) ? newData.diary : current.diary,
      dailyPlan: newData.dailyPlan && typeof newData.dailyPlan === 'object' ? newData.dailyPlan : current.dailyPlan,
      settings: newData.settings && typeof newData.settings === 'object' ? newData.settings : current.settings
    };

    // Espelho de segurança instantâneo
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }

    const payload = JSON.stringify(cachedData, null, 2);

    // 1. Salva no Tauri se estiver no Desktop
    if (isTauriEnvironment()) {
      try {
        await invokeTauri('write_db', { data: payload });
      } catch (err) {
        console.warn('Erro ao salvar via comando nativo Tauri:', err);
      }
    }

    // 2. Salva no arquivo físico db.json via Web API
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: payload
      });
    } catch (e) {
      console.warn('Não foi possível gravar no arquivo físico db.json via API:', e.message);
    }

    // Notifica todos os módulos inscritos
    this.notify(meta);
    return cachedData;
  },

  /**
   * Atualiza uma seção específica de forma atômica
   */
  async updateSection(section, value, meta = {}) {
    const current = this.getData();
    const updated = {
      ...current,
      [section]: value
    };
    return await this.saveData(updated, meta);
  },

  getSettings() {
    return this.getData().settings || defaultData.settings;
  },

  async updateSettings(partial, meta = {}) {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...partial,
      user: {
        ...current.user,
        ...(partial.user || {})
      },
      menuItems: {
        ...current.menuItems,
        ...(partial.menuItems || {})
      }
    };
    return await this.updateSection('settings', updated, meta);
  },

  getDailyPlan() {
    return this.getData().dailyPlan || defaultData.dailyPlan;
  },

  async updateDailyPlan(partial, meta = {}) {
    const current = this.getDailyPlan();
    const updated = {
      ...current,
      ...partial
    };
    return await this.updateSection('dailyPlan', updated, meta);
  }
};
