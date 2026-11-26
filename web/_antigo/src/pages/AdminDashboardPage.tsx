import { AlertTriangle, Clock, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ErroCarga, Mensagem, PageHeader } from '../components/ui';
import { STATUS_COR_BARRA } from '../lib/rotulos';
import { api } from '../lib/api';
import { buscarVisitas } from '../lib/consultas';
import { statusDoErro } from '../lib/erros';
import { baixarArquivo, exportarVisitas } from '../lib/exportar';
import { useSession } from '../lib/session';
import { estaAtrasada, STATUS_VISITA, venceHoje } from '../lib/visitas';
import type { DadosGerais, Role, StatusVisita, Visita } from '../types';

const PERFIS_USUARIO: Record<Role, string> = {
  admin: 'Administradores',
  gestor: 'Gestores',
  fiscalizador: 'Fiscalizadores',
};

const formatadorNumero = new Intl.NumberFormat('pt-BR');
const formatadorMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

function ehContagem(valor: unknown) {
  return Number.isInteger(valor) && (valor as number) >= 0;
}

function contagensValidas(objeto: unknown, chaves: string[]) {
  return objeto !== null && typeof objeto === 'object'
    && chaves.every((chave) => ehContagem((objeto as Record<string, unknown>)[chave]));
}

async function buscarDadosGerais(signal?: AbortSignal) {
  const { data } = await api.get<DadosGerais>('/admin/dados-gerais', { signal });
  const valido = ehContagem(data?.visitas?.total)
    && contagensValidas(data.visitas.por_status, Object.keys(STATUS_VISITA))
    && ehContagem(data?.usuarios?.total)
    && contagensValidas(data.usuarios.por_role, Object.keys(PERFIS_USUARIO))
    && ehContagem(data?.documentos?.total)
    && ehContagem(data?.assinaturas?.total);

  if (!valido) {
    throw new Error('Não foi possível interpretar os dados gerais.');
  }
  return data;
}

function saudacao(agora = new Date()) {
  const hora = agora.getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function montarIndicadores(dados: DadosGerais) {
  const { visitas, documentos, assinaturas } = dados;
  const { agendada, em_andamento: emAndamento, concluida } = visitas.por_status;

  return [
    { titulo: 'Visitas cadastradas', valor: visitas.total, nota: `${formatadorNumero.format(agendada)} agendadas` },
    { titulo: 'Em andamento', valor: emAndamento, nota: 'Fiscais em campo agora' },
    { titulo: 'Concluídas', valor: concluida, nota: 'Com documento assinado' },
    { titulo: 'Documentos gerados', valor: documentos.total, nota: `${formatadorNumero.format(assinaturas.total)} assinaturas coletadas` },
  ];
}

function BarrasHorizontais({ itens, rotulo }: { itens: { chave: string; rotulo: string; total: number; cor: string }[]; rotulo: string }) {
  const maior = Math.max(0, ...itens.map((item) => item.total));

  return (
    <ul className="mt-4 space-y-[19px]" aria-label={rotulo}>
      {itens.map((item) => (
        <li key={item.chave} className="grid grid-cols-[118px_1fr_36px] items-center gap-6">
          <span className="text-sm text-muted-2">{item.rotulo}</span>
          <span className="h-3 overflow-hidden rounded-md bg-track" aria-hidden="true">
            <span className={`block h-3 rounded-md ${item.cor}`} style={{ width: `${maior > 0 ? (item.total / maior) * 100 : 0}%` }} />
          </span>
          <span className="text-right text-sm font-bold text-ink">{formatadorNumero.format(item.total)}</span>
        </li>
      ))}
    </ul>
  );
}

function visitasPorFiscal(visitas: Visita[]) {
  const totais = new Map<number, { nome: string; total: number }>();
  for (const visita of visitas) {
    for (const fiscal of visita.fiscalizadores ?? []) {
      const atual = totais.get(fiscal.id) ?? { nome: fiscal.nome?.split(' ')[0] || `#${fiscal.id}`, total: 0 };
      atual.total += 1;
      totais.set(fiscal.id, atual);
    }
  }
  return [...totais.values()].sort((a, b) => b.total - a.total).slice(0, 8);
}

function ColunasPorFiscal({ visitas }: { visitas: Visita[] }) {
  const colunas = visitasPorFiscal(visitas);
  if (colunas.length === 0) {
    return <p className="mt-4 text-sm text-muted">Nenhuma visita atribuída a fiscalizadores ainda.</p>;
  }
  const maior = Math.max(...colunas.map((coluna) => coluna.total));

  return (
    <>
      <div className="mt-4 flex h-[229px] items-end justify-around gap-4 border-b border-border-3 px-3" aria-label="Visitas por fiscalizador" role="img">
        {colunas.map((coluna, indice) => (
          <div key={indice} className="flex flex-1 flex-col items-center justify-end">
            <span className="mb-1.5 text-[13px] font-bold text-ink">{coluna.total}</span>
            <div className="w-full max-w-[64px] rounded-t-lg bg-[#1677d2]" style={{ height: `${(coluna.total / maior) * 171}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-around gap-4 px-3">
        {colunas.map((coluna, indice) => (
          <span key={indice} className="flex-1 truncate text-center text-xs text-muted">{coluna.nome}</span>
        ))}
      </div>
    </>
  );
}

function Alertas({ visitas }: { visitas: Visita[] }) {
  const atrasadas = visitas.filter((visita) => estaAtrasada(visita)).length;
  const hoje = visitas.filter((visita) => venceHoje(visita)).length;
  const emCampo = visitas.filter((visita) => visita.status === 'em_andamento').length;
  if (atrasadas === 0 && hoje === 0 && emCampo === 0) return null;

  return (
    <section className="mt-7 grid gap-3.5 md:grid-cols-2" aria-label="Alertas">
      {atrasadas > 0 || hoje > 0 ? (
        <Link to="/admin/visitas?status=agendada" className="flex items-center gap-3.5 rounded-[14px] bg-danger-bg px-[18px] py-4 text-[15px] leading-[21px] text-danger-text">
          <Clock size={24} className="shrink-0" aria-hidden="true" />
          <p>
            <b>{atrasadas} {atrasadas === 1 ? 'visita atrasada' : 'visitas atrasadas'}</b>
            {' '}e {hoje} {hoje === 1 ? 'agendada' : 'agendadas'} para hoje.
          </p>
        </Link>
      ) : null}
      {emCampo > 0 ? (
        <Link to="/admin/visitas?status=em_andamento" className="flex items-center gap-3.5 rounded-[14px] bg-warn-bg px-[18px] py-4 text-[15px] leading-[21px] text-warn-text">
          <AlertTriangle size={18} className="shrink-0" fill="#d9a400" stroke="#5c3f00" aria-hidden="true" />
          <p><b>{emCampo} {emCampo === 1 ? 'visita em andamento' : 'visitas em andamento'}</b> — {emCampo === 1 ? 'aguarda' : 'aguardam'} assinaturas e conclusão.</p>
        </Link>
      ) : null}
    </section>
  );
}

export default function AdminDashboardPage() {
  const nome = useSession((state) => state.usuario?.nome);
  const dadosQuery = useQuery({
    queryKey: ['admin', 'dados-gerais'],
    queryFn: ({ signal }) => buscarDadosGerais(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ['visitas'],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });
  const exportarMutation = useMutation({
    mutationFn: () => exportarVisitas(),
    onSuccess: ({ arquivo }) => baixarArquivo(arquivo, 'visitas.csv'),
  });
  const dados = dadosQuery.data;
  const primeiroNome = nome?.trim().split(/\s+/)[0];
  const mes = formatadorMes.format(new Date());

  return (
    <article className="max-w-[1112px]" aria-labelledby="painel-titulo">
      <PageHeader
        eyebrow={`Painel administrativo · ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`}
        title={primeiroNome ? `${saudacao()}, ${primeiroNome}` : 'Painel administrativo'}
        titleId="painel-titulo"
        actions={(
          <>
            <button type="button" className="btn-outline h-[46px]" onClick={() => exportarMutation.mutate()} disabled={exportarMutation.isPending}>
              <Download size={18} aria-hidden="true" /> {exportarMutation.isPending ? 'Exportando…' : 'Exportar CSV'}
            </button>
            <Link to="/admin/usuarios" className="btn-outline h-[46px]">Usuários</Link>
            <Link to="/admin/visitas" className="btn-primary h-[46px]">Ver visitas</Link>
          </>
        )}
      />

      {exportarMutation.isError ? (
        <div className="mt-4">
          <ErroCarga mensagem={statusDoErro(exportarMutation.error) === 403
            ? 'Você não tem permissão para exportar as visitas.'
            : 'Não foi possível exportar as visitas. Tente novamente.'} />
        </div>
      ) : null}

      {visitasQuery.data ? <Alertas visitas={visitasQuery.data} /> : null}

      {dadosQuery.isPending ? (
        <Mensagem carregando>
          {dadosQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar o painel…' : 'Carregando painel…'}
        </Mensagem>
      ) : dadosQuery.isError ? (
        <div className="mt-7">
          <ErroCarga
            mensagem={statusDoErro(dadosQuery.error) === 403
              ? 'Você não tem permissão para consultar os dados gerais.'
              : 'Não foi possível carregar o painel. Verifique sua conexão e tente novamente.'}
            onTentar={() => dadosQuery.refetch()}
            tentando={dadosQuery.isFetching}
          />
        </div>
      ) : (
        <>
          <section className="mt-7 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores gerais" aria-busy={dadosQuery.isFetching}>
            {montarIndicadores(dados!).map((indicador) => (
              <div key={indicador.titulo} className="card p-5">
                <h2 className="text-sm font-semibold text-muted">{indicador.titulo}</h2>
                <p className="mt-2 font-heading text-[34px] font-extrabold leading-none text-navy">{formatadorNumero.format(indicador.valor)}</p>
                <p className="mt-3 text-[13px] font-semibold text-muted-2">{indicador.nota}</p>
              </div>
            ))}
          </section>

          <section className="mt-7 grid gap-3.5 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="titulo-card">Visitas por status</h2>
              <BarrasHorizontais
                rotulo="Quantidade de visitas por status"
                itens={(Object.entries(STATUS_VISITA) as [StatusVisita, string][]).map(([chave, rotulo]) => ({
                  chave, rotulo, total: dados!.visitas.por_status[chave], cor: STATUS_COR_BARRA[chave],
                }))}
              />
            </div>

            <div className="card p-6">
              <h2 className="titulo-card">Visitas por fiscalizador</h2>
              {visitasQuery.isPending ? (
                <p className="mt-4 text-sm text-muted" role="status">Carregando visitas…</p>
              ) : visitasQuery.isError ? (
                <p className="mt-4 text-sm text-danger" role="alert">Não foi possível carregar as visitas.</p>
              ) : (
                <ColunasPorFiscal visitas={visitasQuery.data} />
              )}
            </div>

            <div className="card p-6 lg:col-span-2">
              <h2 className="titulo-card">Usuários por perfil</h2>
              <BarrasHorizontais
                rotulo="Quantidade de usuários por perfil"
                itens={(Object.entries(PERFIS_USUARIO) as [Role, string][]).map(([chave, rotulo]) => ({
                  chave, rotulo, total: dados!.usuarios.por_role[chave], cor: 'bg-[#6a4fc9]',
                }))}
              />
              <p className="mt-4 text-sm text-muted">
                {formatadorNumero.format(dados!.usuarios.total)} usuários cadastrados no total.
              </p>
            </div>
          </section>
        </>
      )}
    </article>
  );
}
