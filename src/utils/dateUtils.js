/**
 * Utilitários simples de data e hora para o aplicativo
 */

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna os últimos 7 dias com status de cumprimento para o mini indicador
 */
export function getLast7Days(completedDates = []) {
  const dateSet = new Set(completedDates);
  const days = [];
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    days.push({
      dateStr,
      label: weekdays[d.getDay()],
      isToday: i === 0,
      completed: dateSet.has(dateStr)
    });
  }
  return days;
}

/**
 * Formata data de forma amigável e relativa (Hoje, Amanhã ou DD/MM)
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const yesterday = getYesterdayDateString();

  if (dateStr === today) return 'Hoje';
  if (dateStr === tomorrow) return 'Amanhã';
  if (dateStr === yesterday) return 'Ontem';

  return formatDateBR(dateStr);
}

/**
 * Calcula dinamicamente a sequência de dias consecutivos para um hábito.
 * A sequência considera se o hábito foi cumprido hoje e ontem em cadeia ininterrupta.
 */
export function calculateStreak(completedDates) {
  if (!Array.isArray(completedDates) || completedDates.length === 0) {
    return 0;
  }

  const dateSet = new Set(completedDates);
  const today = new Date();

  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatYMD(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatYMD(yesterday);

  // Se não foi concluído hoje e nem ontem, a sequência foi quebrada
  let checkDate = new Date(today);
  if (!dateSet.has(todayStr)) {
    if (!dateSet.has(yesterdayStr)) {
      return 0;
    }
    checkDate = yesterday;
  }

  let streak = 0;
  while (true) {
    const currentStr = formatYMD(checkDate);
    if (dateSet.has(currentStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return '';
  try {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateStr);
  }
}

export function formatDateTimeBR(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

export function getFormattedCurrentDate() {
  const now = new Date();
  return now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
