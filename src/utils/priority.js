/**
 * Utilitários para o sistema de prioridades de tarefas
 * Níveis: 'baixa', 'normal', 'alta'
 * Padrão: 'normal'
 */

export const PRIORITY_LEVELS = {
  BAIXA: 'baixa',
  NORMAL: 'normal',
  ALTA: 'alta'
};

/**
 * Normaliza qualquer valor de prioridade para 'baixa', 'normal' ou 'alta'
 * Garante retrocompatibilidade com dados antigos onde o campo não existia.
 */
export function normalizePriority(priority) {
  if (!priority) return PRIORITY_LEVELS.NORMAL;
  const val = String(priority).toLowerCase().trim();
  if (val === 'alta' || val === 'high') return PRIORITY_LEVELS.ALTA;
  if (val === 'baixa' || val === 'low') return PRIORITY_LEVELS.BAIXA;
  return PRIORITY_LEVELS.NORMAL;
}

/**
 * Retorna o rótulo formatado em português
 */
export function getPriorityLabel(priority) {
  const norm = normalizePriority(priority);
  switch (norm) {
    case PRIORITY_LEVELS.ALTA:
      return 'Alta';
    case PRIORITY_LEVELS.BAIXA:
      return 'Baixa';
    case PRIORITY_LEVELS.NORMAL:
    default:
      return 'Normal';
  }
}

/**
 * Retorna o peso numérico para ordenação (Alta > Normal > Baixa)
 */
export function getPriorityWeight(priority) {
  const norm = normalizePriority(priority);
  switch (norm) {
    case PRIORITY_LEVELS.ALTA:
      return 3;
    case PRIORITY_LEVELS.NORMAL:
      return 2;
    case PRIORITY_LEVELS.BAIXA:
      return 1;
    default:
      return 2;
  }
}
