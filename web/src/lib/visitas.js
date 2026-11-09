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

export function formatarDataVisita(valor) {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Data inválida' : formatadorData.format(data);
}
