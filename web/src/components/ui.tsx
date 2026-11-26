import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { PERFIL_ROTULO } from '../lib/rotulos';
import { STATUS_VISITA } from '../lib/visitas';
import type { Role, StatusVisita } from '../types';

const STATUS_ESTILO: Record<StatusVisita, string> = {
  agendada: 'bg-assigned-bg text-assigned',
  em_andamento: 'bg-info-bg text-info',
  concluida: 'bg-success-bg text-success',
  cancelada: 'bg-neutral-bg text-neutral',
};

export function StatusBadge({ status, size = 'sm' }: { status: StatusVisita | string | undefined; size?: 'sm' | 'md' }) {
  const conhecido = status && status in STATUS_VISITA ? (status as StatusVisita) : null;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ${
        size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-[13px]'
      } ${conhecido ? STATUS_ESTILO[conhecido] : 'bg-neutral-bg text-neutral'}`}
    >
      {conhecido ? STATUS_VISITA[conhecido] : 'Status não informado'}
    </span>
  );
}

const PERFIL_ESTILO: Record<Role, string> = {
  admin: 'bg-warn-bg text-warn',
  gestor: 'bg-submitted-bg text-submitted',
  fiscalizador: 'bg-assigned-bg text-assigned',
};

export function PerfilBadge({ role }: { role: Role }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${PERFIL_ESTILO[role] ?? ''}`}>
      {PERFIL_ROTULO[role] ?? role}
    </span>
  );
}

export function Avatar({ iniciais, size = 36, tone = 'light' }: { iniciais: string; size?: number; tone?: 'light' | 'accent' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${
        tone === 'accent' ? 'bg-accent text-navy' : 'bg-assigned-bg text-assigned'
      }`}
      style={{ width: size, height: size, fontSize: size >= 44 ? 16 : 13 }}
    >
      {iniciais}
    </span>
  );
}

export function LogoMark({ size = 36, variant = 'accent' }: { size?: number; variant?: 'accent' | 'navy' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[10px] ${variant === 'accent' ? 'bg-accent' : 'bg-navy'}`}
      style={{ width: size, height: size }}
    >
      <ShieldCheck size={size * 0.55} color={variant === 'accent' ? '#172f6e' : '#ffcc00'} strokeWidth={2.25} />
    </span>
  );
}

export function PageHeader({ eyebrow, title, titleId, actions, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-0.5 text-sm font-semibold text-eyebrow">{eyebrow}</div> : null}
        <h1 id={titleId} className="h-display break-words text-[42px] leading-[1.02]">{title}</h1>
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}

const FAIXA: { bg: string; icon?: 'arrow' | 'spark'; color?: string }[] = [
  { bg: 'bg-navy', icon: 'arrow', color: '#fff' },
  { bg: 'bg-success-2', icon: 'spark', color: '#fff' },
  { bg: 'bg-white' },
  { bg: 'bg-sky' },
  { bg: 'bg-success-2' },
  { bg: 'bg-navy', icon: 'spark', color: '#ffcc00' },
  { bg: 'bg-white' },
  { bg: 'bg-sky', icon: 'arrow', color: '#ffcc00' },
  { bg: 'bg-white' },
  { bg: 'bg-success-2' },
  { bg: 'bg-navy', icon: 'arrow', color: '#fff' },
  { bg: 'bg-white', icon: 'spark', color: '#1e8f3e' },
  { bg: 'bg-sky' },
  { bg: 'bg-success-2' },
  { bg: 'bg-navy' },
];

export function DecorativeStrip({ size = 56 }: { size?: number }) {
  return (
    <div className="flex overflow-hidden" aria-hidden="true">
      {FAIXA.map((bloco, indice) => (
        <span key={indice} className={`inline-flex shrink-0 items-center justify-center ${bloco.bg}`} style={{ width: size, height: size }}>
          {bloco.icon === 'arrow' ? <ArrowUpRight size={size * 0.5} color={bloco.color} strokeWidth={2.5} /> : null}
          {bloco.icon === 'spark' ? <Sparkles size={size * 0.45} color={bloco.color} fill={bloco.color} /> : null}
        </span>
      ))}
    </div>
  );
}

export function Mensagem({ children, carregando = false }: { children: ReactNode; carregando?: boolean }) {
  return (
    <p className={`px-5 py-10 text-center text-sm text-muted ${carregando ? 'animate-pulse' : ''}`} role="status">
      {children}
    </p>
  );
}

export function ErroCarga({ mensagem, onTentar, tentando }: { mensagem: ReactNode; onTentar?: () => void; tentando?: boolean }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-bg px-4 py-3.5 text-sm text-danger-text">
      <p>{mensagem}</p>
      {onTentar ? (
        <button type="button" className="btn-outline h-10" onClick={onTentar} disabled={tentando}>
          {tentando ? 'Tentando novamente…' : 'Tentar novamente'}
        </button>
      ) : null}
    </div>
  );
}

export function ListaErros({ mensagens }: { mensagens: string[] }) {
  if (mensagens.length === 0) return null;
  const [principal, ...detalhes] = mensagens;
  return (
    <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3.5 text-sm text-danger-text">
      <p className="font-semibold">{principal}</p>
      {detalhes.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
          {detalhes.map((mensagem, indice) => <li key={indice}>{mensagem}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
