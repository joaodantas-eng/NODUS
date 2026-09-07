/**
 * Módulo Perfil — Informações do Usuário, Configurações de Tema e Preferências
 * Sincronizado com db.json
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';

export function renderProfile(container) {
  const data = StorageService.getData();
  const settings = StorageService.getSettings();
  const user = settings.user || {
    name: '',
    username: ''
  };

  const currentTheme = settings.theme || 'dark';
  const currentAccent = settings.accentColor || 'orange';

  container.innerHTML = `
    <div class="profile-view-layout">
      <!-- Card de Perfil Principal -->
      <div class="card profile-user-card">
        <div class="profile-header">
          <div class="profile-big-avatar">
            <span>${(user.name ? user.name.slice(0, 2) : 'ND').toUpperCase()}</span>
          </div>
          <div class="profile-header-info">
            <h2>${escapeHtml(user.name || 'Seu Nome')}</h2>
            <span class="text-muted-xs">Membro Nodus</span>
          </div>
        </div>

        <form id="form-user-profile" class="profile-edit-form">
          <div class="form-group" style="margin-bottom: 16px;">
            <label for="prof-name">Nome Completo</label>
            <input type="text" id="prof-name" value="${escapeHtml(user.name || '')}" placeholder="Digite seu nome completo..." required />
          </div>

          <div class="profile-form-footer">
            <span class="save-indicator" id="prof-save-status"></span>
            <button type="submit" class="btn btn-primary">Salvar Informações</button>
          </div>
        </form>
      </div>

      <!-- Configurações de Aparência & Cores (Laranja e Preto Padrão, Suporte a Modo Claro) -->
      <div class="card profile-settings-card">
        <div class="card-header-clean">
          <h3>Aparência & Cores</h3>
          <span class="text-muted-xs">Personalize o visual do Nodus</span>
        </div>

        <!-- Alternador Modo Claro / Modo Escuro -->
        <div class="setting-item">
          <div>
            <strong>Tema da Interface</strong>
            <p class="text-muted-xs">O padrão do Nodus é Preto/Escuro. Alterne para Claro se preferir fundo branco.</p>
          </div>
          <div class="theme-mode-selector" style="display: flex; gap: 8px;">
            <button type="button" class="tab-pill ${currentTheme === 'dark' ? 'active' : ''}" id="btn-theme-dark">
              🌙 Modo Escuro
            </button>
            <button type="button" class="tab-pill ${currentTheme === 'light' ? 'active' : ''}" id="btn-theme-light">
              ☀️ Modo Claro
            </button>
          </div>
        </div>

        <!-- Seletor de Cor de Destaque -->
        <div class="setting-item">
          <div>
            <strong>Cor de Destaque</strong>
            <p class="text-muted-xs">O tom padrão é o Laranja Nodus. Escolha uma das paletas:</p>
          </div>
          <div class="color-options-row">
            <button type="button" class="color-dot-opt ${currentAccent === 'orange' ? 'active' : ''}" data-color="orange" style="background-color: #FF5A1F;" title="Laranja Nodus (Padrão)"></button>
            <button type="button" class="color-dot-opt ${currentAccent === 'black' ? 'active' : ''}" data-color="black" style="background-color: #27272A;" title="Preto / Grafite"></button>
            <button type="button" class="color-dot-opt ${currentAccent === 'emerald' ? 'active' : ''}" data-color="emerald" style="background-color: #10B981;" title="Esmeralda"></button>
            <button type="button" class="color-dot-opt ${currentAccent === 'purple' ? 'active' : ''}" data-color="purple" style="background-color: #A855F7;" title="Roxo"></button>
            <button type="button" class="color-dot-opt ${currentAccent === 'amber' ? 'active' : ''}" data-color="amber" style="background-color: #F59E0B;" title="Âmbar"></button>
            <button type="button" class="color-dot-opt ${currentAccent === 'blue' ? 'active' : ''}" data-color="blue" style="background-color: #3B82F6;" title="Azul"></button>
          </div>
        </div>
      </div>

      <!-- Assistente Krux & Automações -->
      <div class="card profile-settings-card">
        <div class="card-header-clean">
          <h3>Krux & Preferências Diárias</h3>
          <span class="text-muted-xs">Inteligência contextual com modelo local offline-first</span>
        </div>

        <div class="setting-item">
          <div>
            <strong>Krux Conectado</strong>
            <p class="text-muted-xs">Permite ao Krux processar comandos em linguagem natural e analisar tarefas, finanças e hábitos.</p>
          </div>
          <label class="switch-toggle">
            <input type="checkbox" id="check-krux-proactive" ${settings.kruxProactive !== false && settings.koreProactive !== false ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div>
            <strong>Briefing Matinal</strong>
            <p class="text-muted-xs">Horário sugerido para abertura do plano diário.</p>
          </div>
          <input type="time" id="input-briefing-time" value="${settings.morningBriefing || '07:00'}" class="time-input-compact" />
        </div>
      </div>

      <!-- Gestão do Banco de Dados Local -->
      <div class="card profile-settings-card">
        <div class="card-header-clean">
          <h3>Banco de Dados & Backup</h3>
          <span class="text-muted-xs">Armazenamento local em db.json</span>
        </div>

        <div class="setting-item">
          <div>
            <strong>Exportar db.json</strong>
            <p class="text-muted-xs">Faça o download de todos os seus dados para backup ou restauração.</p>
          </div>
          <button class="btn btn-secondary" id="btn-export-db">
            ${getIcon('download')} Baixar Backup JSON
          </button>
        </div>
      </div>
    </div>
  `;

  // Salvar Informações de Perfil
  const profileForm = container.querySelector('#form-user-profile');
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#prof-name').value.trim();
    const prevUser = StorageService.getSettings().user || {};

    await StorageService.updateSettings({
      user: { ...prevUser, name }
    });

    const status = container.querySelector('#prof-save-status');
    if (status) {
      status.textContent = 'Salvo com sucesso!';
      status.style.color = 'var(--success)';
      setTimeout(() => { status.textContent = ''; }, 2000);
    }
  });

  // Alternar Tema Claro / Escuro com Reatividade Imediata
  const btnDark = container.querySelector('#btn-theme-dark');
  const btnLight = container.querySelector('#btn-theme-light');

  const updateThemeUI = async (theme) => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.documentElement.classList.add('theme-light');
      btnLight.classList.add('active');
      btnDark.classList.remove('active');
    } else {
      document.body.classList.remove('theme-light');
      document.documentElement.classList.remove('theme-light');
      btnDark.classList.add('active');
      btnLight.classList.remove('active');
    }
    await StorageService.updateSettings({ theme });
  };

  btnDark.addEventListener('click', () => updateThemeUI('dark'));
  btnLight.addEventListener('click', () => updateThemeUI('light'));

  // Alternar Cor de Destaque com Reatividade Imediata
  container.querySelectorAll('.color-dot-opt').forEach(dot => {
    dot.addEventListener('click', async () => {
      const color = dot.getAttribute('data-color');
      container.querySelectorAll('.color-dot-opt').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      document.documentElement.setAttribute('data-accent', color);
      document.body.setAttribute('data-accent', color);
      await StorageService.updateSettings({ accentColor: color });
    });
  });

  // Toggle Krux Proativo
  const kruxToggle = container.querySelector('#check-krux-proactive');
  if (kruxToggle) {
    kruxToggle.addEventListener('change', async (e) => {
      await StorageService.updateSettings({
        kruxProactive: e.target.checked,
        koreProactive: e.target.checked
      });
    });
  }

  // Briefing Time
  const briefingInput = container.querySelector('#input-briefing-time');
  briefingInput.addEventListener('change', async (e) => {
    await StorageService.updateSettings({ morningBriefing: e.target.value });
  });

  // Exportar db.json
  const exportBtn = container.querySelector('#btn-export-db');
  exportBtn.addEventListener('click', () => {
    const raw = JSON.stringify(StorageService.getData(), null, 2);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodus_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
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
