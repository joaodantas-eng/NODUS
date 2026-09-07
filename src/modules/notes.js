/**
 * Módulo de Notas
 * Editor estilo desktop macOS:
 * - Lista organizada ordenada por data de atualização
 * - Nota selecionada destacada com clareza
 * - Título e conteúdo confortáveis
 * - Auto-save em segundo plano sem perda de foco ou salto de cursor
 * - Estados vazios úteis
 */
import { StorageService } from '../services/storageService.js';
import { generateId } from '../utils/idGenerator.js';
import { formatDateTimeBR } from '../utils/dateUtils.js';
import { getIcon } from '../utils/icons.js';

let selectedNoteId = null;

export function renderNotes(container) {
  container.innerHTML = '';

  const data = StorageService.getData();
  const rawNotes = data.notes || [];

  // Ordena por data de atualização (mais recentes primeiro)
  const notes = [...rawNotes].sort((a, b) => {
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });

  // Se nenhuma nota estiver selecionada e existirem notas, seleciona a primeira
  if (!selectedNoteId && notes.length > 0) {
    selectedNoteId = notes[0].id;
  } else if (selectedNoteId && !notes.some(n => n.id === selectedNoteId)) {
    selectedNoteId = notes.length > 0 ? notes[0].id : null;
  }

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const notesEl = document.createElement('div');
  notesEl.className = 'notes-layout';
  notesEl.id = 'view-notes';

  notesEl.innerHTML = `
    <!-- Coluna Esquerda: Lista de Notas -->
    <div class="notes-sidebar">
      <button type="button" class="btn btn-primary" id="btn-new-note" style="width: 100%;">
        ${getIcon('plus')} Nova Nota
      </button>

      <div class="notes-list" id="notes-list-items">
        ${notes.length === 0 ? `
          <div class="empty-state-box" style="padding: 24px 12px; margin-top: 8px;">
            <div class="empty-state-icon">${getIcon('notes')}</div>
            <h4 class="empty-state-title" style="font-size: 13px;">Nenhuma nota</h4>
            <p class="empty-state-desc" style="font-size: 11.5px;">Crie sua primeira anotação acima.</p>
          </div>
        ` : `
          ${notes.map(n => `
            <div
              class="note-item ${n.id === selectedNoteId ? 'active' : ''}"
              data-id="${n.id}"
              id="note-card-${n.id}"
            >
              <div class="note-item-title">${escapeHtml(n.title || 'Sem título')}</div>
              <div class="note-item-preview">${escapeHtml(n.content ? n.content.replace(/\n/g, ' ') : 'Sem conteúdo adicional')}</div>
              <div class="note-item-date">${formatDateTimeBR(n.updatedAt)}</div>
            </div>
          `).join('')}
        `}
      </div>
    </div>

    <!-- Coluna Direita: Editor da Nota Selecionada -->
    <div class="note-editor" id="note-editor-container">
      ${selectedNote ? `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <input
            type="text"
            id="editor-note-title"
            class="note-title-input"
            value="${escapeHtml(selectedNote.title || '')}"
            placeholder="Título da nota..."
            autocomplete="off"
            spellcheck="false"
          />
          <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
            <button type="button" class="btn btn-danger-subtle btn-sm" id="btn-delete-note" title="Excluir esta nota">
              ${getIcon('trash')} Excluir
            </button>
          </div>
        </div>

        <div style="font-size: 11.5px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; padding-bottom: 2px;">
          <span id="editor-updated-timestamp">Atualizada: ${formatDateTimeBR(selectedNote.updatedAt)}</span>
          <span id="save-status-indicator" style="color: var(--success); font-weight: 500; opacity: 0; transition: opacity 0.25s ease; display: inline-flex; align-items: center; gap: 4px;">
            ${getIcon('check')} Salvo automaticamente
          </span>
        </div>

        <textarea
          id="editor-note-content"
          class="note-content-textarea"
          placeholder="Comece a digitar sua anotação aqui..."
          spellcheck="true"
        >${escapeHtml(selectedNote.content || '')}</textarea>
      ` : `
        <div class="empty-state-box" style="height: 100%; border: none; background: transparent;">
          <div class="empty-state-icon" style="width: 44px; height: 44px;">${getIcon('notes')}</div>
          <h4 class="empty-state-title" style="font-size: 16px;">Nenhuma nota selecionada</h4>
          <p class="empty-state-desc">
            ${notes.length === 0 
              ? 'Comece criando sua primeira anotação para registrar pensamentos, atas e lembretes.' 
              : 'Selecione uma anotação na lista lateral para visualizar e editar seu conteúdo.'}
          </p>
          <button type="button" class="btn btn-primary empty-state-btn" id="btn-create-first-note">
            ${getIcon('plus')} Criar Primeira Nota
          </button>
        </div>
      `}
    </div>
  `;

  container.appendChild(notesEl);

  // Criar nova nota
  const handleCreateNewNote = async () => {
    const newNote = {
      id: generateId('note'),
      title: 'Nova Nota',
      content: '',
      updatedAt: new Date().toISOString()
    };
    const currentNotes = StorageService.getData().notes || [];
    await StorageService.updateSection('notes', [newNote, ...currentNotes]);
    selectedNoteId = newNote.id;
    renderNotes(container);

    // Foca no título da nova nota
    setTimeout(() => {
      const titleInput = container.querySelector('#editor-note-title');
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 50);
  };

  notesEl.querySelector('#btn-new-note')?.addEventListener('click', handleCreateNewNote);
  notesEl.querySelector('#btn-create-first-note')?.addEventListener('click', handleCreateNewNote);

  // Selecionar nota na lista lateral
  notesEl.querySelectorAll('.note-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedNoteId = item.getAttribute('data-id');
      renderNotes(container);
    });
  });

  // Salvar nota automaticamente sem perda de foco
  const titleInput = notesEl.querySelector('#editor-note-title');
  const contentInput = notesEl.querySelector('#editor-note-content');
  const saveStatus = notesEl.querySelector('#save-status-indicator');
  const timestampSpan = notesEl.querySelector('#editor-updated-timestamp');

  const saveCurrentNote = async () => {
    if (!selectedNoteId || !titleInput || !contentInput) return;
    const title = titleInput.value.trim() || 'Sem título';
    const content = contentInput.value;
    const nowIso = new Date().toISOString();

    const currentNotes = StorageService.getData().notes || [];
    const updated = currentNotes.map(n => {
      if (n.id === selectedNoteId) {
        return {
          ...n,
          title,
          content,
          updatedAt: nowIso
        };
      }
      return n;
    });

    await StorageService.updateSection('notes', updated);

    // Atualiza o item na lista lateral diretamente no DOM sem recriar o editor
    const activeCard = notesEl.querySelector(`#note-card-${selectedNoteId}`);
    if (activeCard) {
      const cardTitle = activeCard.querySelector('.note-item-title');
      const cardPreview = activeCard.querySelector('.note-item-preview');
      const cardDate = activeCard.querySelector('.note-item-date');
      if (cardTitle) cardTitle.textContent = title;
      if (cardPreview) cardPreview.textContent = content ? content.replace(/\n/g, ' ') : 'Sem conteúdo adicional';
      if (cardDate) cardDate.textContent = formatDateTimeBR(nowIso);
    }

    if (timestampSpan) {
      timestampSpan.textContent = `Atualizada: ${formatDateTimeBR(nowIso)}`;
    }

    // Feedback visual suave de auto-save
    if (saveStatus) {
      saveStatus.style.opacity = '1';
      clearTimeout(saveStatus._hideTimer);
      saveStatus._hideTimer = setTimeout(() => {
        if (saveStatus) saveStatus.style.opacity = '0';
      }, 1600);
    }
  };

  // Auto-save debounced ao digitar
  let debounceTimer = null;
  const onUserTyping = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveCurrentNote();
    }, 500);
  };

  titleInput?.addEventListener('input', onUserTyping);
  contentInput?.addEventListener('input', onUserTyping);

  // Excluir nota selecionada
  const deleteBtn = notesEl.querySelector('#btn-delete-note');
  deleteBtn?.addEventListener('click', async () => {
    if (!selectedNoteId) return;
    const currentNotes = StorageService.getData().notes || [];
    const updated = currentNotes.filter(n => n.id !== selectedNoteId);
    selectedNoteId = null;
    await StorageService.updateSection('notes', updated);
    renderNotes(container);
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
