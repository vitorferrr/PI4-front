import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TabelaVisitas, { Filtro } from '../components/TabelaVisitas';
import { ErroCarga, Mensagem, PageHeader } from '../components/ui';
import { buscarVisitas } from '../lib/consultas';
import { statusDoErro } from '../lib/erros';
import { normalizarPesquisa, STATUS_VISITA } from '../lib/visitas';

export default function GestorVisitasPage() {
  const [pesquisa, setPesquisa] = useState('');
  const [status, setStatus] = useState('');
  const visitasQuery = useQuery({
    queryKey: ['visitas'],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });
  const visitas = visitasQuery.data ?? [];
  const termo = normalizarPesquisa(pesquisa);
  const visitasFiltradas = visitas.filter((visita) => (
    normalizarPesquisa([visita.denunciado, visita.razao_social, visita.nome_fantasia, visita.cnpj_cpf].filter(Boolean).join(' ')).includes(termo)
    && (!status || visita.status === status)
  ));

  return (
    <article className="max-w-[1112px]" aria-labelledby="visitas-titulo">
      <PageHeader
        eyebrow="Acompanhamento"
        title="Visitas"
        titleId="visitas-titulo"
        actions={(
          <Link to="/gestor/visitas/nova" className="btn-primary h-[44px]">
            <Plus size={18} aria-hidden="true" /> Nova visita
          </Link>
        )}
      />

      <section className="card mt-6 p-[18px]">
        <form className="grid gap-3.5 sm:grid-cols-2" role="search" aria-label="Filtrar visitas" onSubmit={(event) => event.preventDefault()}>
          <Filtro label="Pesquisar por estabelecimento" htmlFor="filtro-pesquisa">
            <input
              id="filtro-pesquisa"
              type="search"
              className="field h-11 text-sm"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Nome, razão social ou CNPJ"
            />
          </Filtro>
          <Filtro label="Status" htmlFor="filtro-status">
            <select id="filtro-status" className="field h-11 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_VISITA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </Filtro>
        </form>
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
        <Mensagem>Nenhuma visita disponível.</Mensagem>
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
