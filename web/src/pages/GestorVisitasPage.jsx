import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SectionCard from '../components/SectionCard';
import VisitaStatus from '../components/VisitaStatus';
import { api } from '../lib/api';
import { formatarDataVisita, STATUS_VISITA } from '../lib/visitas';
import styles from './GestorVisitasPage.module.css';

async function buscarVisitas(signal) {
  const { data } = await api.get('/visitas', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar a lista de visitas.');
  }
  return data;
}

function normalizarPesquisa(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

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
    normalizarPesquisa(visita.denunciado).includes(termo)
    && (!status || visita.status === status)
  ));

  return (
    <article className={styles.page} aria-labelledby="visitas-titulo">
      <header className={styles.header}>
        <h1 id="visitas-titulo" className={styles.title}>Visitas</h1>
        <Link to="/gestor/visitas/nova" className={`${styles.button} ${styles.primaryButton}`}>Nova visita</Link>
      </header>

      <SectionCard title="Visitas cadastradas">
        <form className={styles.filters} role="search" aria-label="Filtrar visitas" onSubmit={(event) => event.preventDefault()}>
          <label className={styles.field}>
            <span>Pesquisar por estabelecimento</span>
            <input
              type="search"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Nome ou razão social"
            />
          </label>
          <label className={styles.field}>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_VISITA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
            </select>
          </label>
        </form>

        {visitasQuery.isPending ? (
          <p className={styles.message} role="status">
            {visitasQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar as visitas…' : 'Carregando visitas…'}
          </p>
        ) : visitasQuery.isError ? (
          <div className={styles.error} role="alert">
            <p>{visitasQuery.error.response?.status === 403
              ? 'Você não tem permissão para consultar as visitas.'
              : 'Não foi possível carregar as visitas. Verifique sua conexão e tente novamente.'}</p>
            <button type="button" className={styles.button} onClick={() => visitasQuery.refetch()} disabled={visitasQuery.isFetching}>
              {visitasQuery.isFetching ? 'Tentando novamente…' : 'Tentar novamente'}
            </button>
          </div>
        ) : visitas.length === 0 ? (
          <p className={styles.message} role="status">Nenhuma visita disponível.</p>
        ) : (
          <>
            <p className={styles.summary} role="status">
              Exibindo {visitasFiltradas.length} de {visitas.length} visitas.
              {visitasQuery.isFetching && ' Atualizando visitas…'}
            </p>
            {visitasFiltradas.length === 0 ? (
              <p className={styles.message}>Nenhuma visita corresponde aos filtros informados.</p>
            ) : (
              <div className={styles.tableContainer} role="region" aria-label="Tabela de visitas" tabIndex={0} aria-busy={visitasQuery.isFetching}>
                <table className={styles.table}>
                  <caption className={styles.caption}>Visitas disponíveis para consulta. Datas no fuso do navegador.</caption>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Estabelecimento</th>
                      <th scope="col">Data agendada</th>
                      <th scope="col">Gestor</th>
                      <th scope="col">Status</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitasFiltradas.map((visita) => (
                      <tr key={visita.id}>
                        <td>{visita.id}</td>
                        <th scope="row">{visita.denunciado || 'Não informado'}</th>
                        <td>{formatarDataVisita(visita.data_agendada)}</td>
                        <td>{visita.gestor?.nome || 'Não informado'}</td>
                        <td><VisitaStatus status={visita.status} /></td>
                        <td>
                          <Link to={`/gestor/visitas/${visita.id}`} className={styles.detailsLink}
                            aria-label={`Ver detalhes da visita ${visita.id}: ${visita.denunciado}`}>
                            Ver detalhes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </article>
  );
}
