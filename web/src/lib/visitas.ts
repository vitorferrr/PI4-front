import type { StatusVisita, Visita } from '../types';

export const STATUS_VISITA: Record<StatusVisita, string> = {
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const STATUS_ABERTOS: StatusVisita[] = ['agendada', 'em_andamento'];

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const formatadorDia = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

// Pesquisa ignorando maiúsculas e acentos ("SAO JOSE" encontra "São José").
export function normalizarPesquisa(valor: unknown) {
  return String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function paraData(valor: unknown) {
  if (!valor) return null;
  const data = new Date(valor as string);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarDataVisita(valor: unknown) {
  if (!valor) return 'Não informada';
  const data = paraData(valor);
  return data ? formatadorData.format(data) : 'Data inválida';
}

export function formatarDia(valor: unknown) {
  const data = paraData(valor);
  return data ? formatadorDia.format(data) : '—';
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function estaAtrasada(visita: Visita, agora = new Date()) {
  const data = paraData(visita.data_agendada);
  return visita.status === 'agendada' && data !== null && data < agora && !mesmoDia(data, agora);
}

export function venceHoje(visita: Visita, agora = new Date()) {
  const data = paraData(visita.data_agendada);
  return STATUS_ABERTOS.includes(visita.status) && data !== null && mesmoDia(data, agora);
}

export function concluidaNoMes(visita: Visita, agora = new Date()) {
  const data = paraData(visita.data_realizacao ?? visita.data_agendada);
  return visita.status === 'concluida' && data !== null
    && data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth();
}

export function nomeEstabelecimento(visita: Visita) {
  return visita.nome_fantasia?.trim() || visita.denunciado?.trim() || 'Não informado';
}

export function detalheEstabelecimento(visita: Visita) {
  return [visita.bairro, visita.cnpj_cpf].filter((valor) => valor && String(valor).trim()).join(' · ');
}

export function nomesFiscalizadores(visita: Visita) {
  const nomes = (visita.fiscalizadores ?? []).map((fiscalizador) => fiscalizador.nome).filter(Boolean);
  return nomes.length > 0 ? nomes.join(', ') : 'Nenhum fiscalizador';
}

export interface CargaFiscal {
  abertas: number;
  vencemHoje: number;
  atrasadas: number;
  noMes: number;
}

// Carga de cada fiscal calculada a partir das visitas que a API devolve.
export function calcularCargas(visitas: Visita[], agora = new Date()) {
  const cargas = new Map<number, CargaFiscal>();
  for (const visita of visitas) {
    for (const fiscal of visita.fiscalizadores ?? []) {
      const carga = cargas.get(fiscal.id) ?? { abertas: 0, vencemHoje: 0, atrasadas: 0, noMes: 0 };
      if (STATUS_ABERTOS.includes(visita.status)) carga.abertas += 1;
      if (venceHoje(visita, agora)) carga.vencemHoje += 1;
      if (estaAtrasada(visita, agora)) carga.atrasadas += 1;
      if (concluidaNoMes(visita, agora)) carga.noMes += 1;
      cargas.set(fiscal.id, carga);
    }
  }
  return cargas;
}

export const CARGA_VAZIA: CargaFiscal = { abertas: 0, vencemHoje: 0, atrasadas: 0, noMes: 0 };

// Faixas da legenda: leve até 3 visitas abertas, normal de 4 a 5, sobrecarga a partir de 6.
export function corDaCarga(abertas: number) {
  if (abertas >= 6) return 'bg-[#d9a400]';
  if (abertas >= 4) return 'bg-[#1677d2]';
  return 'bg-[#2f9e5b]';
}

export const CAPACIDADE_REFERENCIA = 8;

export function larguraDaCarga(abertas: number) {
  return `${Math.min(abertas / CAPACIDADE_REFERENCIA, 1) * 100}%`;
}

export function iniciais(nome: unknown) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toLocaleUpperCase('pt-BR');
}
