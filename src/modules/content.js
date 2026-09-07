/**
 * Módulo Conteúdo — Planejador e Pipeline de Criação de Conteúdo do Nodus
 * Criação, edição e exclusão de conteúdos em todas as etapas do funil
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';
import { getTodayDateString } from '../utils/dateUtils.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let activeStatusFilter = 'all';

export function renderContent(container) {
  const data = StorageService.getData();
  const contents = (data.content || []).slice().sort((a, b) => {
    return new Date(b.scheduledDate || b.createdAt || 0) - new Date(a.scheduledDate || a.createdAt || 0);
  });

  const filtered = contents.filter(item => {
    if (activeStatusFilter === 'all') return true;
    return item.status === activeStatusFilter;
  });

  const statuses = [
    { key: 'all', label: 'Todos' },
    { key: 'ideia', label: 'Ideia' },
    { key: 'roteiro', label: 'Roteiro' },
    { key: 'gravando', label: 'Gravando' },
    { key: 'editando', label: 'Editando' },
    { key: 'agendado', label: 'Agendado' },
    { key: 'publicado', label: 'Publicado' }
  ];

  container.innerHTML = `
    <div class="content-view-layout">
      <!-- Toolbar Superior: Filtros em Preto/Laranja e Botão Novo Conteúdo -->
      <div class="content-toolbar" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <div class="finance-pills-selector scrollable-pills">
          ${statuses.map(st => `
            <button type="button" class="fin-pill-btn ${activeStatusFilter === st.key ? 'active' : ''}" data-status="${st.key}">
              ${st.label} ${st.key === 'all' ? `(${contents.length})` : `(${contents.filter(c => c.status === st.key).length})`}
            </button>
          `).join('')}
        </div>

        <button type="button" class="btn btn-primary" id="btn-new-content">
          ${getIcon('plus')}
          <span>Novo Conteúdo</span>
        </button>
      </div>

      <!-- Grid de Conteúdos -->
      ${filtered.length === 0 ? `
        <div class="card empty-state-card" style="text-align: center; padding: 48px 24px;">
          <span class="empty-icon" style="font-size: 36px; display: block; margin-bottom: 12px;">🎬</span>
          <h3>Nenhum conteúdo nesta etapa</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Adicione ideias de vídeos, reels, carrosséis ou roteiros para sua produção.</p>
          <button type="button" class="btn btn-primary" id="btn-empty-new-content">
            ${getIcon('plus')} Criar Conteúdo Agora
          </button>
        </div>
      ` : `
        <div class="content-cards-grid">
          ${filtered.map(item => `
            <div class="card content-card" data-id="${item.id}">
              <div class="content-card-top">
                <div class="content-tags">
                  <span class="platform-badge platform-${(item.platform || 'instagram').toLowerCase()}">
                    ${escapeHtml(item.platform || 'Instagram')}
                  </span>
                  <span class="format-badge">${escapeHtml(item.format || 'Reel')}</span>
                </div>
                <span class="content-status-pill status-${item.status || 'ideia'}">
                  ${getStatusLabel(item.status)}
                </span>
              </div>

              <h3 class="content-title">${escapeHtml(item.title)}</h3>

              ${item.script ? `
                <div class="content-snippet">
                  ${escapeHtml(item.script.slice(0, 110))}${item.script.length > 110 ? '...' : ''}
                </div>
              ` : ''}

              <div class="content-card-footer">
                <div class="content-date-info">
                  <span class="text-muted-xs">📅 ${item.scheduledDate ? formatDisplayDate(item.scheduledDate) : 'Sem data'}</span>
                </div>
                <div class="content-actions">
                  <button type="button" class="action-icon-btn btn-edit-content" title="Editar conteúdo">
                    ${getIcon('edit')}
                  </button>
                  <button type="button" class="action-icon-btn btn-del-content" title="Excluir">
                    ${getIcon('trash')}
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // Ouvintes de filtros
  container.querySelectorAll('.fin-pill-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.getAttribute('data-status');
      renderContent(container);
    });
  });

  // Novo Conteúdo
  const newBtn = container.querySelector('#btn-new-content') || container.querySelector('#btn-empty-new-content');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      openContentModal(container);
    });
  }

  // Editar Conteúdo
  container.querySelectorAll('.btn-edit-content').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.content-card');
      const id = card?.getAttribute('data-id');
      const item = contents.find(c => c.id === id);
      if (item) openContentModal(container, item);
    });
  });

  // Excluir Conteúdo
  container.querySelectorAll('.btn-del-content').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.content-card');
      const id = card?.getAttribute('data-id');
      const item = contents.find(c => c.id === id);
      if (!id) return;

      confirmModal({
        title: 'Excluir Conteúdo',
        message: `Deseja realmente excluir o conteúdo "${item?.title || 'Selecionado'}"?`,
        confirmText: 'Excluir Conteúdo',
        onConfirm: async () => {
          const all = StorageService.getData().content || [];
          await StorageService.updateSection('content', all.filter(c => c.id !== id));
          showToast('Conteúdo excluído com sucesso!', 'success');
          renderContent(container);
          return true;
        }
      });
    });
  });
}

function getStatusLabel(status) {
  const map = {
    ideia: 'Ideia',
    roteiro: 'Roteiro',
    gravando: 'Gravando',
    editando: 'Editando',
    agendado: 'Agendado',
    publicado: 'Publicado'
  };
  return map[status] || status;
}

function openContentModal(container, existingItem = null) {
  const isEditing = Boolean(existingItem);
  const initialStatus = existingItem?.status || (activeStatusFilter !== 'all' ? activeStatusFilter : 'ideia');

  const contentHtml = `
    <div class="form-group" style="margin-bottom: 14px;">
      <label for="c-title" style="display: block; margin-bottom: 6px; font-weight: 500;">Título / Gancho Principal</label>
      <input 
        type="text" 
        id="c-title" 
        value="${escapeHtml(existingItem?.title || '')}" 
        placeholder="Ex: 3 Hábitos que dobraram meu foco" 
        required 
        style="width: 100%;" 
      />
    </div>

    <div class="form-row" style="display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;">
      <div class="form-group" style="flex: 1; min-width: 140px;">
        <label for="c-platform" style="display: block; margin-bottom: 6px; font-weight: 500;">Plataforma</label>
        <select id="c-platform" style="width: 100%;">
          <option value="Instagram" ${existingItem?.platform === 'Instagram' ? 'selected' : ''}>Instagram</option>
          <option value="YouTube" ${existingItem?.platform === 'YouTube' ? 'selected' : ''}>YouTube</option>
          <option value="TikTok" ${existingItem?.platform === 'TikTok' ? 'selected' : ''}>TikTok</option>
          <option value="LinkedIn" ${existingItem?.platform === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
          <option value="X" ${existingItem?.platform === 'X' ? 'selected' : ''}>Twitter / X</option>
        </select>
      </div>

      <div class="form-group" style="flex: 1; min-width: 140px;">
        <label for="c-format" style="display: block; margin-bottom: 6px; font-weight: 500;">Formato</label>
        <select id="c-format" style="width: 100%;">
          <option value="Reel" ${existingItem?.format === 'Reel' ? 'selected' : ''}>Reel / Short</option>
          <option value="Carrossel" ${existingItem?.format === 'Carrossel' ? 'selected' : ''}>Carrossel</option>
          <option value="Vídeo Longo" ${existingItem?.format === 'Vídeo Longo' ? 'selected' : ''}>Vídeo Longo</option>
          <option value="Post Texto" ${existingItem?.format === 'Post Texto' ? 'selected' : ''}>Post em Texto</option>
          <option value="Story" ${existingItem?.format === 'Story' ? 'selected' : ''}>Story</option>
        </select>
      </div>

      <div class="form-group" style="flex: 1; min-width: 140px;">
        <label for="c-status" style="display: block; margin-bottom: 6px; font-weight: 500;">Status da Produção</label>
        <select id="c-status" style="width: 100%;">
          <option value="ideia" ${initialStatus === 'ideia' ? 'selected' : ''}>Ideia</option>
          <option value="roteiro" ${initialStatus === 'roteiro' ? 'selected' : ''}>Roteiro</option>
          <option value="gravando" ${initialStatus === 'gravando' ? 'selected' : ''}>Gravando</option>
          <option value="editando" ${initialStatus === 'editando' ? 'selected' : ''}>Editando</option>
          <option value="agendado" ${initialStatus === 'agendado' ? 'selected' : ''}>Agendado</option>
          <option value="publicado" ${initialStatus === 'publicado' ? 'selected' : ''}>Publicado</option>
        </select>
      </div>
    </div>

    <div class="form-group" style="margin-bottom: 14px;">
      <label for="c-date" style="display: block; margin-bottom: 6px; font-weight: 500;">Data Prevista / Publicação</label>
      <input 
        type="date" 
        id="c-date" 
        value="${existingItem?.scheduledDate || getTodayDateString()}" 
        style="width: 100%;" 
      />
    </div>

    <div class="form-group" style="margin-bottom: 8px;">
      <label for="c-script" style="display: block; margin-bottom: 6px; font-weight: 500;">Estrutura do Roteiro / Ideias</label>
      <textarea 
        id="c-script" 
        rows="4" 
        placeholder="1. Gancho forte nos primeiros 3 segundos&#10;2. Conteúdo central e exemplo prático&#10;3. Chamada para ação (CTA)"
        style="width: 100%;"
      >${escapeHtml(existingItem?.script || '')}</textarea>
    </div>
  `;

  openModal({
    title: isEditing ? 'Editar Conteúdo' : 'Planejar Novo Conteúdo',
    contentHtml,
    confirmText: isEditing ? 'Salvar Alterações' : 'Salvar Conteúdo',
    onOpen: (dialog) => {
      dialog.querySelector('#c-title')?.focus();
    },
    onConfirm: async ({ dialog, setError }) => {
      const title = dialog.querySelector('#c-title')?.value.trim();
      const platform = dialog.querySelector('#c-platform')?.value || 'Instagram';
      const format = dialog.querySelector('#c-format')?.value || 'Reel';
      const status = dialog.querySelector('#c-status')?.value || 'ideia';
      const scheduledDate = dialog.querySelector('#c-date')?.value || getTodayDateString();
      const script = dialog.querySelector('#c-script')?.value.trim() || '';

      if (!title) {
        setError('Por favor, informe o título do conteúdo.');
        return false;
      }

      const all = [...(StorageService.getData().content || [])];
      if (isEditing) {
        const updated = all.map(item => {
          if (item.id !== existingItem.id) return item;
          return { ...item, title, platform, format, status, scheduledDate, script, updatedAt: new Date().toISOString() };
        });
        await StorageService.updateSection('content', updated);
      } else {
        const newItem = {
          id: `content-${Date.now()}`,
          title,
          platform,
          format,
          status,
          scheduledDate,
          script,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await StorageService.updateSection('content', [newItem, ...all]);
      }

      showToast(isEditing ? 'Conteúdo atualizado!' : 'Conteúdo criado com sucesso!', 'success');
      renderContent(container);
      return true;
    }
  });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
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
