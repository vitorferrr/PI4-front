import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { StatusBadge } from './ui';
import { detalheEstabelecimento, estaAtrasada, formatarDataVisita, nomeEstabelecimento, nomesFiscalizadores } from '../lib/visitas';
import type { Visita } from '../types';

export function Filtro({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}

export default function TabelaVisitas({ visitas, rotuloVoltar, carregando }: { visitas: Visita[]; rotuloVoltar: string; carregando?: boolean }) {
  const location = useLocation();

  return (
    <div className="card mt-6 overflow-x-auto" role="region" aria-label="Tabela de visitas" tabIndex={0} aria-busy={carregando}>
      <table className="w-full min-w-[980px] text-left text-sm">
        <caption className="sr-only">Visitas. Datas no fuso do navegador.</caption>
        <thead className="bg-table-head text-muted">
          <tr>
            {['Estabelecimento', 'Gestor', 'Fiscalizador', 'Data agendada', 'Status'].map((titulo) => (
              <th key={titulo} scope="col" className="px-5 py-3.5 font-semibold">{titulo}</th>
            ))}
            <th scope="col" className="px-5 py-3.5 text-right font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          {visitas.map((visita) => {
            const atrasada = estaAtrasada(visita);
            const detalhe = detalheEstabelecimento(visita);
            return (
              <tr key={visita.id} className="border-t border-row-line">
                <th scope="row" className="px-5 py-3 font-normal">
                  <div className="font-semibold text-ink">{nomeEstabelecimento(visita)}</div>
                  <div className="whitespace-nowrap text-[13px] text-muted">
                    #{visita.id}{detalhe ? ` · ${detalhe}` : ''}
                  </div>
                </th>
                <td className="px-5 py-3 text-muted-2">{visita.gestor?.nome || 'Gestor não informado'}</td>
                <td className="px-5 py-3 text-ink">{nomesFiscalizadores(visita)}</td>
                <td className={`whitespace-nowrap px-5 py-3 font-semibold ${atrasada ? 'text-danger' : 'text-ink'}`}>
                  {formatarDataVisita(visita.data_agendada)}{atrasada ? ' · atrasada' : ''}
                </td>
                <td className="px-5 py-3"><StatusBadge status={visita.status} /></td>
                <td className="px-5 py-3 text-right">
                  <Link
                    to={`/gestor/visitas/${visita.id}`}
                    className="link"
                    state={{ voltarPara: location.pathname + location.search, rotuloVoltar }}
                    aria-label={`Ver detalhes da visita ${visita.id}: ${visita.denunciado}`}
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
