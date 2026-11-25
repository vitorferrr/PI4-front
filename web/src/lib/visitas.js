export const STATUS_VISITA = {
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Pesquisa ignorando maiúsculas e acentos ("SAO JOSE" encontra "São José").
export function normalizarPesquisa(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function formatarDataVisita(valor) {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Data inválida' : formatadorData.format(data);
}
