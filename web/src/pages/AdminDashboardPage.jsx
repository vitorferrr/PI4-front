import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SectionCard from '../components/SectionCard';
import { api } from '../lib/api';
import { STATUS_VISITA } from '../lib/visitas';
import styles from './AdminDashboardPage.module.css';

const PERFIS_USUARIO = {
  admin: 'Administradores',
  gestor: 'Gestores',
  fiscalizador: 'Fiscalizadores',
};

const formatadorNumero = new Intl.NumberFormat('pt-BR');

function ehContagem(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function contagensValidas(objeto, chaves) {
  return objeto !== null && typeof objeto === 'object' && chaves.every((chave) => ehContagem(objeto[chave]));
}

async function buscarDadosGerais(signal) {
  const { data } = await api.get('/admin/dados-gerais', { signal });
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

function montarIndicadores(dados) {
  const { visitas, documentos, assinaturas } = dados;
  const { agendada, em_andamento: emAndamento, concluida } = visitas.por_status;

  return [
    { titulo: 'Visitas cadastradas', valor: visitas.total, nota: `${formatadorNumero.format(agendada)} agendadas` },
    { titulo: 'Em andamento', valor: emAndamento },
    { titulo: 'Concluídas', valor: concluida },
    { titulo: 'Documentos gerados', valor: documentos.total, nota: `${formatadorNumero.format(assinaturas.total)} assinaturas coletadas` },
  ];
}

function GraficoBarras({ itens, rotulo }) {
  const maior = Math.max(0, ...itens.map((item) => item.total));

  return (
    <ul className={styles.barras} aria-label={rotulo}>
      {itens.map((item) => (
        <li key={item.chave} className={styles.barra}>
          <span className={styles.barraRotulo}>{item.rotulo}</span>
          <span className={styles.barraTrilho} aria-hidden="true">
            <span
              className={`${styles.barraPreenchimento} ${styles[item.chave] ?? ''}`}
              style={{ width: `${maior > 0 ? (item.total / maior) * 100 : 0}%` }}
            />
          </span>
          <span className={styles.barraValor}>{formatadorNumero.format(item.total)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboardPage() {
  const dadosQuery = useQuery({
    queryKey: ['admin', 'dados-gerais'],
    queryFn: ({ signal }) => buscarDadosGerais(signal),
  });
  const dados = dadosQuery.data;

  return (
    <article className={styles.page} aria-labelledby="painel-titulo">
      <header className={styles.header}>
        <h1 id="painel-titulo" className={styles.title}>Painel administrativo</h1>
        <div className={styles.actions}>
          <Link to="/admin/usuarios" className={styles.button}>Usuários</Link>
          <Link to="/admin/visitas" className={`${styles.button} ${styles.primaryButton}`}>Ver visitas</Link>
        </div>
      </header>

      {dadosQuery.isPending ? (
        <p className={styles.message} role="status">
          {dadosQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar o painel…' : 'Carregando painel…'}
        </p>
      ) : dadosQuery.isError ? (
        <div className={styles.error} role="alert">
          <p>{dadosQuery.error.response?.status === 403
            ? 'Você não tem permissão para consultar os dados gerais.'
            : 'Não foi possível carregar o painel. Verifique sua conexão e tente novamente.'}</p>
          <button type="button" className={styles.button} onClick={() => dadosQuery.refetch()} disabled={dadosQuery.isFetching}>
            {dadosQuery.isFetching ? 'Tentando novamente…' : 'Tentar novamente'}
          </button>
        </div>
      ) : (
        <>
          <section className={styles.indicadores} aria-label="Indicadores gerais" aria-busy={dadosQuery.isFetching}>
            {montarIndicadores(dados).map((indicador) => (
              <div key={indicador.titulo} className={styles.indicador}>
                <h2 className={styles.indicadorTitulo}>{indicador.titulo}</h2>
                <p className={styles.indicadorValor}>{formatadorNumero.format(indicador.valor)}</p>
                {indicador.nota && <p className={styles.indicadorNota}>{indicador.nota}</p>}
              </div>
            ))}
          </section>

          <div className={styles.graficos}>
            <SectionCard title="Visitas por status">
              <GraficoBarras
                rotulo="Quantidade de visitas por status"
                itens={Object.entries(STATUS_VISITA).map(([chave, rotulo]) => ({
                  chave, rotulo, total: dados.visitas.por_status[chave],
                }))}
              />
            </SectionCard>

            <SectionCard title="Usuários por perfil">
              <GraficoBarras
                rotulo="Quantidade de usuários por perfil"
                itens={Object.entries(PERFIS_USUARIO).map(([chave, rotulo]) => ({
                  chave, rotulo, total: dados.usuarios.por_role[chave],
                }))}
              />
              <p className={styles.totalUsuarios}>
                {formatadorNumero.format(dados.usuarios.total)} usuários cadastrados no total.
              </p>
            </SectionCard>
          </div>
        </>
      )}
    </article>
  );
}
