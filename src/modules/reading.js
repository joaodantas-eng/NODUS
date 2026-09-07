/**
 * Módulo Leitura — Estante de Livros e Hábitos de Leitura do Nodus
 * Métricas reais de páginas lidas no total, cadastro de novos livros, edição completa e exclusão
 */
import { StorageService } from '../services/storageService.js';
import { getIcon } from '../utils/icons.js';
import { openModal, confirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let activeReadingTab = 'reading'; // 'reading' | 'to-read' | 'finished' | 'all'

export function renderReading(container) {
  const data = StorageService.getData();
  const books = data.reading || [];

  const filtered = books.filter(b => {
    if (activeReadingTab === 'reading') return b.status === 'reading';
    if (activeReadingTab === 'to-read') return b.status === 'to-read';
    if (activeReadingTab === 'finished') return b.status === 'finished';
    return true;
  });

  // Cálculo real do total de páginas lidas em todos os livros cadastrados
  const totalPagesRead = books.reduce((acc, b) => {
    if (b.status === 'finished') {
      return acc + (b.totalPages || b.currentPage || 0);
    }
    return acc + (b.currentPage || 0);
  }, 0);

  const finishedCount = books.filter(b => b.status === 'finished').length;
  const currentReadingCount = books.filter(b => b.status === 'reading').length;
  const toReadCount = books.filter(b => b.status === 'to-read').length;

  container.innerHTML = `
    <div class="reading-view-layout">
      <!-- Toolbar & Métricas em Destaque -->
      <div class="reading-header-metrics" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div class="finance-metric-card" style="padding: 16px;">
          <div class="metric-card-header">
            <span class="metric-label">Total de Páginas Lidas</span>
            <span class="metric-icon-box" style="background: rgba(255, 90, 31, 0.15); color: var(--accent);">📖</span>
          </div>
          <div class="metric-value" style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 6px 0;">
            ${totalPagesRead.toLocaleString('pt-BR')} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">páginas</span>
          </div>
          <div class="metric-subtext">Soma de todos os livros lidos</div>
        </div>

        <div class="finance-metric-card" style="padding: 16px;">
          <div class="metric-card-header">
            <span class="metric-label">Lendo Atualmente</span>
            <span class="metric-icon-box" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6;">⏳</span>
          </div>
          <div class="metric-value" style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 6px 0;">
            ${currentReadingCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">em andamento</span>
          </div>
          <div class="metric-subtext">${toReadCount} na fila para ler</div>
        </div>

        <div class="finance-metric-card" style="padding: 16px;">
          <div class="metric-card-header">
            <span class="metric-label">Livros Concluídos</span>
            <span class="metric-icon-box" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">✓</span>
          </div>
          <div class="metric-value positive" style="font-size: 24px; font-weight: 700; margin: 6px 0;">
            ${finishedCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">finalizados</span>
          </div>
          <div class="metric-subtext">Metas de leitura alcançadas</div>
        </div>
      </div>

      <!-- Barra de Filtros e Ação -->
      <div class="reading-toolbar" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <div class="finance-pills-selector">
          <button type="button" class="fin-pill-btn ${activeReadingTab === 'reading' ? 'active' : ''}" data-tab="reading">
            Lendo Agora (${currentReadingCount})
          </button>
          <button type="button" class="fin-pill-btn ${activeReadingTab === 'to-read' ? 'active' : ''}" data-tab="to-read">
            Quero Ler (${toReadCount})
          </button>
          <button type="button" class="fin-pill-btn ${activeReadingTab === 'finished' ? 'active' : ''}" data-tab="finished">
            Concluídos (${finishedCount})
          </button>
          <button type="button" class="fin-pill-btn ${activeReadingTab === 'all' ? 'active' : ''}" data-tab="all">
            Todos (${books.length})
          </button>
        </div>

        <button type="button" class="btn btn-primary" id="btn-add-book">
          ${getIcon('plus')}
          <span>Adicionar Livro</span>
        </button>
      </div>

      <!-- Grid de Livros -->
      ${filtered.length === 0 ? `
        <div class="card empty-state-card" style="text-align: center; padding: 48px 24px;">
          <span class="empty-icon" style="font-size: 36px; display: block; margin-bottom: 12px;">📚</span>
          <h3>Nenhum livro nesta categoria</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Mantenha sua mente afiada registrando seus livros e acompanhando suas páginas diárias.</p>
          <button type="button" class="btn btn-primary" id="btn-empty-add-book">
            ${getIcon('plus')} Cadastrar Primeiro Livro
          </button>
        </div>
      ` : `
        <div class="books-grid">
          ${filtered.map(book => {
            const current = book.status === 'finished' ? (book.totalPages || book.currentPage || 1) : (book.currentPage || 0);
            const total = book.totalPages || 1;
            const pct = Math.min(100, Math.round((current / total) * 100));
            return `
              <div class="card book-card" data-id="${book.id}">
                <div class="book-card-header">
                  <div class="book-cover-mockup">
                    <span class="book-spine-icon">${getIcon('reading')}</span>
                  </div>
                  <div class="book-info">
                    <h3 class="book-title">${escapeHtml(book.title)}</h3>
                    <span class="book-author">${escapeHtml(book.author || 'Autor não informado')}</span>
                    <div class="book-rating-stars">
                      ${renderStars(book.rating || 5)}
                    </div>
                  </div>
                </div>

                <div class="book-progress-box">
                  <div class="book-progress-labels">
                    <span class="pages-read">${current} de ${total} pág lidas</span>
                    <span class="pct-read">${pct}%</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                  </div>
                </div>

                <div class="book-card-actions" style="display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: 12px;">
                  <button type="button" class="btn btn-secondary btn-sm btn-update-page" title="Atualizar página lida" style="flex: 1; font-size: 12px; padding: 6px 10px;">
                    ${getIcon('edit')} Progresso
                  </button>
                  <button type="button" class="action-icon-btn btn-edit-book" title="Editar dados do livro">
                    ${getIcon('edit')}
                  </button>
                  <button type="button" class="action-icon-btn btn-del-book" title="Remover livro">
                    ${getIcon('trash')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  // Ouvintes de Tab
  container.querySelectorAll('.fin-pill-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeReadingTab = btn.getAttribute('data-tab');
      renderReading(container);
    });
  });

  // Adicionar Livro (Novo Livro ou Primeiro Livro)
  ['#btn-add-book', '#btn-empty-add-book'].forEach(selector => {
    const btn = container.querySelector(selector);
    if (btn) {
      btn.addEventListener('click', () => {
        openBookFormModal(container);
      });
    }
  });

  // Editar Livro
  container.querySelectorAll('.btn-edit-book').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.book-card');
      const id = card?.getAttribute('data-id');
      const book = books.find(b => b.id === id);
      if (book) openBookFormModal(container, book);
    });
  });

  // Atualizar Página Rápido
  container.querySelectorAll('.btn-update-page').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.book-card');
      const id = card?.getAttribute('data-id');
      const book = books.find(b => b.id === id);
      if (book) openQuickProgressModal(container, book);
    });
  });

  // Excluir Livro
  container.querySelectorAll('.btn-del-book').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.book-card');
      const id = card?.getAttribute('data-id');
      const book = books.find(b => b.id === id);
      if (!id) return;

      confirmModal({
        title: 'Remover Livro',
        message: `Deseja realmente remover o livro "${book?.title || 'Selecionado'}" da sua estante?`,
        confirmText: 'Remover Livro',
        onConfirm: async () => {
          const all = StorageService.getData().reading || [];
          await StorageService.updateSection('reading', all.filter(b => b.id !== id));
          showToast('Livro removido com sucesso!', 'success');
          renderReading(container);
          return true;
        }
      });
    });
  });
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
  }
  return stars;
}

// Modal de Criação / Edição Completa de Livro
function openBookFormModal(container, bookToEdit = null) {
  const isEditing = Boolean(bookToEdit);

  const contentHtml = `
    <div class="form-group" style="margin-bottom: 14px;">
      <label for="b-title" style="display: block; margin-bottom: 6px; font-weight: 500;">Título do Livro</label>
      <input 
        type="text" 
        id="b-title" 
        placeholder="Ex: Hábitos Atômicos" 
        value="${escapeHtml(bookToEdit?.title || '')}" 
        required 
        style="width: 100%;" 
      />
    </div>

    <div class="form-group" style="margin-bottom: 14px;">
      <label for="b-author" style="display: block; margin-bottom: 6px; font-weight: 500;">Autor</label>
      <input 
        type="text" 
        id="b-author" 
        placeholder="Ex: James Clear" 
        value="${escapeHtml(bookToEdit?.author || '')}" 
        required 
        style="width: 100%;" 
      />
    </div>

    <div class="form-row" style="display: flex; gap: 12px; margin-bottom: 14px;">
      <div class="form-group" style="flex: 1;">
        <label for="b-curr" style="display: block; margin-bottom: 6px; font-weight: 500;">Página Atual</label>
        <input 
          type="number" 
          id="b-curr" 
          value="${bookToEdit?.currentPage ?? 0}" 
          min="0" 
          required 
          style="width: 100%;" 
        />
      </div>
      <div class="form-group" style="flex: 1;">
        <label for="b-total" style="display: block; margin-bottom: 6px; font-weight: 500;">Total de Páginas</label>
        <input 
          type="number" 
          id="b-total" 
          value="${bookToEdit?.totalPages || 250}" 
          min="1" 
          required 
          style="width: 100%;" 
        />
      </div>
    </div>

    <div class="form-row" style="display: flex; gap: 12px; margin-bottom: 14px;">
      <div class="form-group" style="flex: 1;">
        <label for="b-status" style="display: block; margin-bottom: 6px; font-weight: 500;">Status</label>
        <select id="b-status" style="width: 100%;">
          <option value="reading" ${bookToEdit?.status === 'reading' ? 'selected' : ''}>Lendo Agora</option>
          <option value="to-read" ${bookToEdit?.status === 'to-read' ? 'selected' : ''}>Quero Ler</option>
          <option value="finished" ${bookToEdit?.status === 'finished' ? 'selected' : ''}>Concluído</option>
        </select>
      </div>
      <div class="form-group" style="flex: 1;">
        <label for="b-rating" style="display: block; margin-bottom: 6px; font-weight: 500;">Avaliação</label>
        <select id="b-rating" style="width: 100%;">
          <option value="5" ${bookToEdit?.rating === 5 ? 'selected' : ''}>5 estrelas ★★★★★</option>
          <option value="4" ${bookToEdit?.rating === 4 ? 'selected' : ''}>4 estrelas ★★★★☆</option>
          <option value="3" ${bookToEdit?.rating === 3 ? 'selected' : ''}>3 estrelas ★★★☆☆</option>
          <option value="2" ${bookToEdit?.rating === 2 ? 'selected' : ''}>2 estrelas ★★☆☆☆</option>
          <option value="1" ${bookToEdit?.rating === 1 ? 'selected' : ''}>1 estrela ★☆☆☆☆</option>
        </select>
      </div>
    </div>
  `;

  openModal({
    title: isEditing ? 'Editar Livro' : 'Adicionar Novo Livro',
    contentHtml,
    confirmText: isEditing ? 'Salvar Alterações' : 'Cadastrar Livro',
    onOpen: (dialog) => {
      dialog.querySelector('#b-title')?.focus();
    },
    onConfirm: async ({ dialog, setError }) => {
      const title = dialog.querySelector('#b-title')?.value.trim();
      const author = dialog.querySelector('#b-author')?.value.trim();
      const currentPage = parseInt(dialog.querySelector('#b-curr')?.value, 10) || 0;
      const totalPages = parseInt(dialog.querySelector('#b-total')?.value, 10) || 1;
      let status = dialog.querySelector('#b-status')?.value || 'reading';
      const rating = parseInt(dialog.querySelector('#b-rating')?.value, 10) || 5;

      if (!title) {
        setError('Por favor, informe o título do livro.');
        return false;
      }

      if (currentPage >= totalPages && status !== 'to-read') {
        status = 'finished';
      }

      const all = [...(StorageService.getData().reading || [])];
      if (isEditing) {
        const updated = all.map(b => {
          if (b.id !== bookToEdit.id) return b;
          return { ...b, title, author, currentPage, totalPages, status, rating };
        });
        await StorageService.updateSection('reading', updated);
      } else {
        const newBook = {
          id: `book-${Date.now()}`,
          title,
          author,
          currentPage,
          totalPages,
          status,
          rating,
          createdAt: new Date().toISOString()
        };
        await StorageService.updateSection('reading', [newBook, ...all]);
      }

      showToast(isEditing ? 'Livro atualizado!' : 'Livro cadastrado com sucesso!', 'success');
      renderReading(container);
      return true;
    }
  });
}

// Modal Rápido para Atualizar Página Lida
function openQuickProgressModal(container, book) {
  const contentHtml = `
    <div class="form-group" style="margin-bottom: 14px;">
      <label for="up-curr" style="display: block; margin-bottom: 6px; font-weight: 500;">
        Página Atual (de ${book.totalPages} páginas no total)
      </label>
      <input 
        type="number" 
        id="up-curr" 
        value="${book.currentPage || 0}" 
        min="0" 
        max="${book.totalPages}" 
        required 
        style="width: 100%; font-size: 16px;" 
      />
    </div>
  `;

  openModal({
    title: `Progresso: ${escapeHtml(book.title)}`,
    contentHtml,
    confirmText: 'Salvar Progresso',
    onOpen: (dialog) => {
      dialog.querySelector('#up-curr')?.focus();
    },
    onConfirm: async ({ dialog }) => {
      const newPage = parseInt(dialog.querySelector('#up-curr')?.value, 10) || 0;
      const isFinished = newPage >= (book.totalPages || 1);

      const all = StorageService.getData().reading || [];
      const updated = all.map(b => {
        if (b.id !== book.id) return b;
        return {
          ...b,
          currentPage: newPage,
          status: isFinished ? 'finished' : (b.status === 'to-read' ? 'reading' : b.status)
        };
      });

      await StorageService.updateSection('reading', updated);
      showToast('Progresso atualizado!', 'success');
      renderReading(container);
      return true;
    }
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
