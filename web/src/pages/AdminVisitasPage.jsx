import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import SectionCard from '../components/SectionCard';
import VisitaStatus from '../components/VisitaStatus';
import { api } from '../lib/api';
import { formatarDataVisita, normalizarPesquisa, STATUS_VISITA } from '../lib/visitas';
import styles from './AdminVisitasPage.module.css';

async function buscarVisitas(signal) {
  const { data } = await api.get('/visitas', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar a lista de visitas.');
  }
  return data;
}

// O CSV é gerado pelo back com os mesmos filtros de status, gestor e fiscalizador.
async function exportarVisitas(filtros) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
  const response = await api.get('/admin/exportar', { params, responseType: 'blob' });
  return {
    arquivo: response.data,
    total: Number(response.headers?.['x-total-count']) || 0,
    truncado: response.headers?.['x-truncated'] === 'true',
  };
}

function baixarArquivo(arquivo, nome) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Gestores e fiscalizadores que aparecem nas visitas, sem repetição e em ordem alfabética.
function listarPessoas(visitas, obterPessoas) {
  const pessoas = new Map();
  for (const visita of visitas) {
    for (const pessoa of obterPessoas(visita)) {
      if (pessoa?.id != null) pessoas.set(String(pessoa.id), pessoa.nome || `Usuário ${pessoa.id}`);
    }
  }
  return [...pessoas].sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'));
}

function nomesFiscalizadores(visita) {
  const nomes = (visita.fiscalizadores ?? []).map((fiscalizador) => fiscalizador.nome).filter(Boolean);
  return nomes.length > 0 ? nomes.join(', ') : 'Nenhum atribuído';
}

export default function AdminVisitasPage() {
  const [pesquisa, setPesquisa] = useState('');
  const [status, setStatus] = useState('');
  const [gestor, setGestor] = useState('');
  const [fiscalizador, setFiscalizador] = useState('');
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
    normalizarPesquisa(visita.denunciado).includes(termo)
    && (!status || visita.status === status)
    && (!gestor || String(visita.gestor?.id) === gestor)
    && (!fiscalizador || (visita.fiscalizadores ?? []).some((f) => String(f.id) === fiscalizador))
  ));

  const exportar = () => {
    exportarMutation.mutate({ status, gestor_id: gestor, fiscalizador_id: fiscalizador });
  };

  return (
    <article className={styles.page} aria-labelledby="admin-visitas-titulo">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Todas as equipes</p>
          <h1 id="admin-visitas-titulo" className={styles.title}>Visitas</h1>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={exportar}
          disabled={exportarMutation.isPending}
        >
          {exportarMutation.isPending ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </header>

      {exportarMutation.isError ? (
        <p className={styles.exportError} role="alert">
          {exportarMutation.error.response?.status === 403
            ? 'Você não tem permissão para exportar as visitas.'
            : 'Não foi possível exportar as visitas. Tente novamente.'}
        </p>
      ) : exportarMutation.isSuccess ? (
        <p className={styles.exportInfo} role="status">
          {exportarMutation.data.truncado
            ? `O arquivo foi limitado às primeiras visitas de um total de ${exportarMutation.data.total}. Use os filtros para exportar o restante.`
            : 'Arquivo visitas.csv gerado.'}
        </p>
      ) : null}

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
          <label className={styles.field}>
            <span>Gestor</span>
            <select value={gestor} onChange={(event) => setGestor(event.target.value)}>
              <option value="">Todos os gestores</option>
              {gestores.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Fiscalizador</span>
            <select value={fiscalizador} onChange={(event) => setFiscalizador(event.target.value)}>
              <option value="">Todos os fiscalizadores</option>
              {fiscalizadores.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
        </form>
        <p className={styles.hint}>A exportação em CSV usa os filtros de status, gestor e fiscalizador.</p>

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
          <p className={styles.message} role="status">Nenhuma visita cadastrada.</p>
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
                  <caption className={styles.caption}>Visitas de todas as equipes. Datas no fuso do navegador.</caption>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Estabelecimento</th>
                      <th scope="col">Data agendada</th>
                      <th scope="col">Gestor</th>
                      <th scope="col">Fiscalizadores</th>
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
                        <td>{nomesFiscalizadores(visita)}</td>
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
