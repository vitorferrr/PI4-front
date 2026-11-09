import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SectionCard from '../components/SectionCard';
import { api } from '../lib/api';
import styles from './GestorVisitaDetalhePage.module.css';

const STATUS_VISITA = {
  agendada: { texto: 'Agendada', classe: styles.agendada },
  em_andamento: { texto: 'Em andamento', classe: styles.emAndamento },
  concluida: { texto: 'Concluída', classe: styles.concluida },
  cancelada: { texto: 'Cancelada', classe: styles.cancelada },
};

const ERROS_VISITA = {
  401: {
    titulo: 'Autenticação necessária',
    mensagem: 'Sua sessão não foi reconhecida. Entre novamente para consultar a visita.',
  },
  403: {
    titulo: 'Acesso não permitido',
    mensagem: 'Você não tem permissão para visualizar esta visita.',
  },
  404: {
    titulo: 'Visita não encontrada',
    mensagem: 'Não foi encontrada uma visita com o ID informado.',
  },
};

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatarData(valor) {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Data inválida' : formatadorData.format(data);
}

function textoOuAusente(valor) {
  return valor == null || String(valor).trim() === '' ? 'Não informado' : String(valor);
}

function obterUrlPdf(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  try {
    const url = new URL(valor.trim(), api.defaults.baseURL);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function repetirConsulta(falhas, erro) {
  const status = erro.response?.status;
  return falhas < 1 && (!status || status >= 500);
}

async function buscarVisita(id, signal) {
  const { data } = await api.get(`/visitas/${id}`, { signal });
  return data ?? null;
}

async function buscarQuestionario(signal) {
  const { data } = await api.get('/questionario', { signal });
  if (!Array.isArray(data)) {
    throw new Error('Não foi possível interpretar as perguntas do questionário.');
  }
  return data;
}

function StatusVisita({ status }) {
  const apresentacao = STATUS_VISITA[status];
  return (
    <span className={`${styles.status} ${apresentacao?.classe ?? ''}`}>
      {apresentacao?.texto ?? 'Status não informado'}
    </span>
  );
}

function Informacao({ rotulo, children }) {
  return (
    <div className={styles.informacao}>
      <dt>{rotulo}</dt>
      <dd>{children ?? 'Não informado'}</dd>
    </div>
  );
}

function PessoaResumo({ usuario }) {
  return (
    <div>
      <h3 className={styles.itemTitle}>{textoOuAusente(usuario.nome)}</h3>
      <dl className={styles.infoGrid}>
        <Informacao rotulo="ID">{usuario.id}</Informacao>
        <Informacao rotulo="Perfil">{textoOuAusente(usuario.role)}</Informacao>
        <Informacao rotulo="E-mail">{textoOuAusente(usuario.email)}</Informacao>
      </dl>
    </div>
  );
}

function TentarNovamente({ onClick, carregando }) {
  return (
    <button type="button" className={styles.button} onClick={onClick} disabled={carregando}>
      {carregando ? 'Tentando novamente…' : 'Tentar novamente'}
    </button>
  );
}

function QuestionarioVisita({ respostas }) {
  const perguntasQuery = useQuery({
    queryKey: ['questionario'],
    queryFn: ({ signal }) => buscarQuestionario(signal),
    enabled: respostas.length > 0,
    retry: repetirConsulta,
  });

  if (respostas.length === 0) {
    return <p className={styles.muted}>Nenhuma resposta registrada para esta visita.</p>;
  }

  const perguntasOrdenadas = [...(perguntasQuery.data ?? [])].sort((a, b) => {
    const ordemA = Number.isFinite(a.ordem) ? a.ordem : Number.MAX_SAFE_INTEGER;
    const ordemB = Number.isFinite(b.ordem) ? b.ordem : Number.MAX_SAFE_INTEGER;
    return ordemA - ordemB || a.id - b.id;
  });
  const perguntasPorId = new Map(perguntasOrdenadas.map((pergunta) => [String(pergunta.id), pergunta]));
  const ordemPorId = new Map(perguntasOrdenadas.map((pergunta, indice) => [String(pergunta.id), indice]));
  const respostasOrdenadas = [...respostas].sort((a, b) => (
    (ordemPorId.get(String(a.pergunta_id)) ?? Number.MAX_SAFE_INTEGER)
    - (ordemPorId.get(String(b.pergunta_id)) ?? Number.MAX_SAFE_INTEGER)
  ));

  return (
    <>
      {perguntasQuery.isPending && (
        <p className={styles.feedback} role="status">
          {perguntasQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar as perguntas…' : 'Carregando perguntas…'}
        </p>
      )}
      {perguntasQuery.isError && (
        <div className={styles.error} role="alert">
          <p>
            Não foi possível carregar as perguntas do questionário.
            As respostas continuam disponíveis, identificadas pelo ID da pergunta.
          </p>
          {perguntasQuery.error.response?.status === 401 && (
            <Link to="/login" className={styles.textLink}>Entrar novamente</Link>
          )}
          <TentarNovamente onClick={() => perguntasQuery.refetch()} carregando={perguntasQuery.isFetching} />
        </div>
      )}
      <ol className={styles.list}>
        {respostasOrdenadas.map((resposta) => {
          const pergunta = perguntasPorId.get(String(resposta.pergunta_id));
          return (
            <li key={resposta.id} className={styles.listItem}>
              <h3 className={styles.itemTitle}>
                {pergunta?.texto || `Pergunta #${resposta.pergunta_id} — texto indisponível`}
              </h3>
              <p className={styles.preserveLines}>{textoOuAusente(resposta.resposta)}</p>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function DocumentosVisita({ documentos }) {
  if (documentos.length === 0) {
    return <p className={styles.muted}>Nenhum documento vinculado a esta visita.</p>;
  }

  return (
    <ul className={styles.list}>
      {documentos.map((documento) => {
        const urlPdf = obterUrlPdf(documento.url_arquivo_pdf);
        const envioEmail = documento.enviado_email === true
          ? 'Enviado'
          : documento.enviado_email === false ? 'Não enviado' : 'Não informado';
        return (
          <li key={documento.id} className={styles.listItem}>
            <div className={styles.itemHeader}>
              <h3 className={styles.itemTitle}>Documento #{documento.id}</h3>
              {urlPdf && (
                <a href={urlPdf} target="_blank" rel="noopener noreferrer" className={styles.textLink}
                  aria-label={`Abrir PDF do documento ${documento.id} em nova aba`}>
                  Abrir PDF ↗
                </a>
              )}
            </div>
            <dl className={styles.infoGrid}>
              <Informacao rotulo="Data de geração">{formatarData(documento.data_geracao)}</Informacao>
              <Informacao rotulo="Envio por e-mail">{envioEmail}</Informacao>
            </dl>
            {!urlPdf && <p className={styles.muted}>PDF indisponível.</p>}
          </li>
        );
      })}
    </ul>
  );
}

function DadosVisita({ visita }) {
  const fiscalizadores = Array.isArray(visita.fiscalizadores) ? visita.fiscalizadores : [];
  const respostas = Array.isArray(visita.respostas) ? visita.respostas : [];
  const documentos = Array.isArray(visita.documentos) ? visita.documentos : [];

  return (
    <div className={styles.sections}>
      <SectionCard title="Informações gerais" className={styles.fullWidth}>
        <dl className={styles.infoGrid}>
          <Informacao rotulo="Denunciado">{textoOuAusente(visita.denunciado)}</Informacao>
          <Informacao rotulo="Data agendada">{formatarData(visita.data_agendada)}</Informacao>
          <Informacao rotulo="Início da visita">{formatarData(visita.data_realizacao)}</Informacao>
          <Informacao rotulo="Latitude">{textoOuAusente(visita.latitude)}</Informacao>
          <Informacao rotulo="Longitude">{textoOuAusente(visita.longitude)}</Informacao>
          <Informacao rotulo="Criada em">{formatarData(visita.createdAt)}</Informacao>
          <Informacao rotulo="Atualizada em">{formatarData(visita.updatedAt)}</Informacao>
        </dl>
        <p className={styles.dateNote}>Datas e horários apresentados no fuso do navegador.</p>
      </SectionCard>

      <SectionCard title="Gestor responsável">
        {visita.gestor ? <PessoaResumo usuario={visita.gestor} /> : (
          <>
            <p className={styles.muted}>Os dados do gestor não estão disponíveis.</p>
            <dl className={styles.infoGrid}>
              <Informacao rotulo="ID do gestor">{visita.gestor_id}</Informacao>
            </dl>
          </>
        )}
      </SectionCard>

      <SectionCard title="Fiscalizadores vinculados">
        {fiscalizadores.length > 0 ? (
          <ul className={styles.list}>
            {fiscalizadores.map((usuario) => (
              <li key={usuario.id} className={styles.listItem}><PessoaResumo usuario={usuario} /></li>
            ))}
          </ul>
        ) : <p className={styles.muted}>Nenhum fiscalizador vinculado a esta visita.</p>}
      </SectionCard>

      <SectionCard title="Observações" className={styles.fullWidth}>
        {visita.observacoes_livres?.trim() ? (
          <p className={styles.preserveLines}>{visita.observacoes_livres}</p>
        ) : <p className={styles.muted}>Nenhuma observação registrada.</p>}
      </SectionCard>

      <SectionCard title="Questionário e respostas" className={styles.fullWidth}>
        <QuestionarioVisita respostas={respostas} />
      </SectionCard>

      <SectionCard title="Documentos vinculados" className={styles.fullWidth}>
        <DocumentosVisita documentos={documentos} />
      </SectionCard>
    </div>
  );
}

export default function GestorVisitaDetalhePage() {
  const { id } = useParams();
  const idValido = /^\d+$/.test(id ?? '') && Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const visitaQuery = useQuery({
    queryKey: ['visita', id],
    queryFn: ({ signal }) => buscarVisita(id, signal),
    enabled: idValido,
    retry: repetirConsulta,
  });
  const visita = visitaQuery.data;
  const erro = ERROS_VISITA[visitaQuery.error?.response?.status] ?? {
    titulo: 'Não foi possível carregar a visita',
    mensagem: 'Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.',
  };

  return (
    <article className={styles.page} aria-labelledby="visita-detalhe-titulo">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 id="visita-detalhe-titulo" className={styles.title}>Detalhes da visita</h1>
          <p className={styles.identifier}>Visita #{id}</p>
        </div>
        <div className={styles.headerActions}>
          {idValido && visita && !visitaQuery.isError && <StatusVisita status={visita.status} />}
          <Link to="/" className={styles.button}>Voltar ao início</Link>
        </div>
      </header>

      {!idValido ? (
        <SectionCard title="ID inválido">
          <p role="alert">O identificador da visita deve ser um número inteiro positivo válido.</p>
        </SectionCard>
      ) : visitaQuery.isPending ? (
        <SectionCard title="Informações da visita">
          <p className={styles.muted} role="status">
            {visitaQuery.fetchStatus === 'paused' ? 'Aguardando conexão para carregar a visita…' : 'Carregando detalhes da visita…'}
          </p>
        </SectionCard>
      ) : visitaQuery.isError ? (
        <SectionCard title={erro.titulo}>
          <div className={styles.error} role="alert">
            <p>{erro.mensagem}</p>
            <div className={styles.actions}>
              {visitaQuery.error.response?.status === 401 && (
                <Link to="/login" className={styles.textLink}>Entrar novamente</Link>
              )}
              <TentarNovamente onClick={() => visitaQuery.refetch()} carregando={visitaQuery.isFetching} />
            </div>
          </div>
        </SectionCard>
      ) : !visita ? (
        <SectionCard title="Dados indisponíveis">
          <div className={styles.feedback}>
            <p>Nenhum dado da visita foi retornado.</p>
            <TentarNovamente onClick={() => visitaQuery.refetch()} carregando={visitaQuery.isFetching} />
          </div>
        </SectionCard>
      ) : <DadosVisita visita={visita} />}
    </article>
  );
}
