import type { ChangeEvent } from 'react';
import { Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import TabelaVisitas, { Filtro } from '../components/TabelaVisitas';
import { ErroCarga, Mensagem, PageHeader } from '../components/ui';
import { buscarVisitas } from '../lib/consultas';
import { statusDoErro } from '../lib/erros';
import { baixarArquivo, exportarVisitas } from '../lib/exportar';
import { estaAtrasada, normalizarPesquisa, STATUS_VISITA } from '../lib/visitas';
import type { UsuarioResumo, Visita } from '../types';

// Gestores e fiscalizadores que aparecem nas visitas, sem repetição e em ordem alfabética.
function listarPessoas(visitas: Visita[], obterPessoas: (visita: Visita) => (UsuarioResumo | null | undefined)[]) {
  const pessoas = new Map<string, string>();
  for (const visita of visitas) {
    for (const pessoa of obterPessoas(visita)) {
      if (pessoa?.id != null) pessoas.set(String(pessoa.id), pessoa.nome || `Usuário ${pessoa.id}`);
    }
  }
  return [...pessoas].sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'));
}

function textoDaVisita(visita: Visita) {
  return normalizarPesquisa([visita.denunciado, visita.razao_social, visita.nome_fantasia, visita.cnpj_cpf].filter(Boolean).join(' '));
}

export default function AdminVisitasPage() {
  // Os filtros ficam na URL para continuarem aplicados ao voltar do detalhe da visita.
  const [filtros, setFiltros] = useSearchParams();
  const pesquisa = filtros.get('pesquisa') ?? '';
  const status = filtros.get('status') ?? '';
  const gestor = filtros.get('gestor') ?? '';
  const fiscalizador = filtros.get('fiscalizador') ?? '';
  const soAtrasadas = filtros.get('atrasadas') === '1';
  const alterarFiltro = (nome: string) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const alvo = event.target as HTMLInputElement;
    const valor = alvo.type === 'checkbox' ? (alvo.checked ? '1' : '') : alvo.value;
    setFiltros((atuais) => {
      const novos = new URLSearchParams(atuais);
      if (valor) novos.set(nome, valor);
      else novos.delete(nome);
      return novos;
    }, { replace: true });
  };
  const visitasQuery = useQuery({
    queryKey: ['visitas'],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });
  const exportarMutation = useMutation({
    mutationFn: exportarVisitas,
    onSuccess: ({ arquivo }) => baixarArquivo(arquivo, 'visitas.csv'),
  });

  const visitas = visitasQuery.data ?? [];
  const gestores = listarPessoas(visitas, (visita) => [visita.gestor]);
  const fiscalizadores = listarPessoas(visitas, (visita) => visita.fiscalizadores ?? []);
  const termo = normalizarPesquisa(pesquisa);
  const visitasFiltradas = visitas.filter((visita) => (
    textoDaVisita(visita).includes(termo)
    && (!status || visita.status === status)
    && (!gestor || String(visita.gestor?.id) === gestor)
    && (!fiscalizador || (visita.fiscalizadores ?? []).some((f) => String(f.id) === fiscalizador))
    && (!soAtrasadas || estaAtrasada(visita))
  ));

  const exportar = () => {
    exportarMutation.mutate({ status, gestor_id: gestor, fiscalizador_id: fiscalizador });
  };

  return (
    <article className="max-w-[1112px]" aria-labelledby="admin-visitas-titulo">
      <PageHeader
        eyebrow="Todas as equipes"
        title="Visitas"
        titleId="admin-visitas-titulo"
        actions={(
          <button type="button" onClick={exportar} disabled={exportarMutation.isPending} className="btn-outline h-[44px]">
            <Download size={18} aria-hidden="true" /> {exportarMutation.isPending ? 'Exportando…' : 'Exportar CSV'}
          </button>
        )}
      />

      {exportarMutation.isError ? (
        <div className="mt-4">
          <ErroCarga mensagem={statusDoErro(exportarMutation.error) === 403
            ? 'Você não tem permissão para exportar as visitas.'
            : 'Não foi possível exportar as visitas. Tente novamente.'} />
        </div>
      ) : exportarMutation.isSuccess ? (
        <p className="mt-4 rounded-xl bg-info-bg px-4 py-3 text-sm text-info" role="status">
          {exportarMutation.data.truncado
            ? `O arquivo não traz todas as ${exportarMutation.data.total} visitas, porque o servidor limita o tamanho da exportação. Refine os filtros para exportar menos visitas por vez.`
            : 'Arquivo visitas.csv gerado.'}
        </p>
      ) : null}

      <section className="card mt-6 p-[18px]">
        <form className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filtrar visitas" onSubmit={(event) => event.preventDefault()}>
          <Filtro label="Estabelecimento ou CNPJ" htmlFor="filtro-pesquisa">
            <input id="filtro-pesquisa" type="search" className="field h-11 text-sm" placeholder="Nome, razão social ou CNPJ" value={pesquisa} onChange={alterarFiltro('pesquisa')} />
          </Filtro>
          <Filtro label="Status" htmlFor="filtro-status">
            <select id="filtro-status" className="field h-11 text-sm" value={status} onChange={alterarFiltro('status')}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_VISITA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </Filtro>
          <Filtro label="Gestor" htmlFor="filtro-gestor">
            <select id="filtro-gestor" className="field h-11 text-sm" value={gestor} onChange={alterarFiltro('gestor')}>
              <option value="">Todos os gestores</option>
              {gestores.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </Filtro>
          <Filtro label="Fiscalizador" htmlFor="filtro-fiscalizador">
            <select id="filtro-fiscalizador" className="field h-11 text-sm" value={fiscalizador} onChange={alterarFiltro('fiscalizador')}>
              <option value="">Todos os fiscalizadores</option>
              {fiscalizadores.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </Filtro>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-muted-2">
            <input type="checkbox" checked={soAtrasadas} onChange={alterarFiltro('atrasadas')} className="h-[18px] w-[18px] accent-primary" />
            Só atrasadas
          </label>
          <p className="text-[13px] text-muted">A exportação em CSV usa os filtros de status, gestor e fiscalizador.</p>
        </div>
      </section>

      {visitasQuery.isPending ? (
        <Mensagem carregando>
          {visitasQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar as visitas…' : 'Carregando visitas…'}
        </Mensagem>
      ) : visitasQuery.isError ? (
        <div className="mt-6">
          <ErroCarga
            mensagem={statusDoErro(visitasQuery.error) === 403
              ? 'Você não tem permissão para consultar as visitas.'
              : 'Não foi possível carregar as visitas. Verifique sua conexão e tente novamente.'}
            onTentar={() => visitasQuery.refetch()}
            tentando={visitasQuery.isFetching}
          />
        </div>
      ) : visitas.length === 0 ? (
        <Mensagem>Nenhuma visita cadastrada.</Mensagem>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted" role="status">
            Exibindo {visitasFiltradas.length} de {visitas.length} visitas.
            {visitasQuery.isFetching && ' Atualizando visitas…'}
          </p>
          {visitasFiltradas.length === 0 ? (
            <Mensagem>Nenhuma visita corresponde aos filtros informados.</Mensagem>
          ) : (
            <TabelaVisitas visitas={visitasFiltradas} rotuloVoltar="Voltar para visitas" carregando={visitasQuery.isFetching} />
          )}
        </>
      )}
    </article>
  );
}
