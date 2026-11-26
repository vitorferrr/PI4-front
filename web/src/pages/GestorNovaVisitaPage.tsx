import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListaErros, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { buscarUsuarios, buscarVisitas } from '../lib/consultas';
import { mensagensDoErro } from '../lib/erros';
import { calcularCargas, CARGA_VAZIA, corDaCarga, larguraDaCarga } from '../lib/visitas';
import { useNovaVisitaStore } from '../store/novaVisitaStore';
import type { Visita } from '../types';

const CAMPOS_ESTABELECIMENTO = [
  { chave: 'razao_social', rotulo: 'Razão social', placeholder: 'ex.: Boa Praça Comércio de Alimentos Ltda' },
  { chave: 'nome_fantasia', rotulo: 'Nome fantasia', placeholder: 'ex.: Mercadinho Boa Praça' },
  { chave: 'cnpj_cpf', rotulo: 'CNPJ/CPF', placeholder: 'ex.: 12.345.678/0001-90' },
  { chave: 'atividade', rotulo: 'Atividade', placeholder: 'ex.: Supermercado' },
  { chave: 'endereco', rotulo: 'Endereço', placeholder: 'ex.: Av. Bernardo Vieira de Melo, 1520' },
  { chave: 'bairro', rotulo: 'Bairro', placeholder: 'ex.: Piedade' },
  { chave: 'cep', rotulo: 'CEP', placeholder: 'ex.: 54.410-010' },
  { chave: 'telefone', rotulo: 'Telefone', placeholder: 'ex.: (81) 3333-4444' },
] as const;

type CampoEstabelecimento = (typeof CAMPOS_ESTABELECIMENTO)[number]['chave'];

async function criarVisita(dados: Record<string, unknown>) {
  const response = await api.post<Visita>('/visitas', dados);
  return response.data;
}

function validar({ denunciado, dataAgendada, fiscalizadoresSelecionados }: { denunciado: string; dataAgendada: string; fiscalizadoresSelecionados: number[] }) {
  const erros: Record<string, string> = {};
  if (!denunciado.trim()) {
    erros.denunciado = 'Informe os dados do denunciado.';
  }
  if (!dataAgendada) {
    erros.dataAgendada = 'Informe a data agendada.';
  }
  if (fiscalizadoresSelecionados.length !== 1) {
    erros.fiscalizador = 'Selecione o fiscalizador da visita.';
  }
  return erros;
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="card p-[25px]">
      <h2 className="mb-4 flex items-center gap-3 font-heading text-[23px] font-extrabold text-navy">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary font-body text-sm font-bold text-white" aria-hidden="true">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function ErroCampo({ id, mensagem }: { id: string; mensagem?: string }) {
  return mensagem ? <p id={id} className="mt-2 text-[13px] font-medium text-danger">{mensagem}</p> : null;
}

const formatadorResumo = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function GestorNovaVisitaPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [denunciado, setDenunciado] = useState('');
  const [estabelecimento, setEstabelecimento] = useState<Record<CampoEstabelecimento, string>>(
    () => Object.fromEntries(CAMPOS_ESTABELECIMENTO.map(({ chave }) => [chave, ''])) as Record<CampoEstabelecimento, string>,
  );
  const [dataAgendada, setDataAgendada] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  const fiscalizadoresSelecionados = useNovaVisitaStore((state) => state.fiscalizadoresSelecionados);
  const toggleFiscalizador = useNovaVisitaStore((state) => state.toggleFiscalizador);
  const limparSelecao = useNovaVisitaStore((state) => state.limparSelecao);

  const usuariosQuery = useQuery({
    queryKey: ['usuarios'],
    queryFn: ({ signal }) => buscarUsuarios(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ['visitas'],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });

  const fiscalizadores = (usuariosQuery.data ?? []).filter((usuario) => usuario.role === 'fiscalizador');
  const cargas = calcularCargas(visitasQuery.data ?? []);
  const fiscalDaUrl = Number(params.get('fiscal'));

  useEffect(() => {
    if (Number.isSafeInteger(fiscalDaUrl) && fiscalDaUrl > 0 && fiscalizadores.some((fiscal) => fiscal.id === fiscalDaUrl)
      && useNovaVisitaStore.getState().fiscalizadoresSelecionados.length === 0) {
      toggleFiscalizador(fiscalDaUrl);
    }
  }, [fiscalDaUrl, fiscalizadores, toggleFiscalizador]);

  useEffect(() => {
    return () => limparSelecao();
  }, [limparSelecao]);

  const criarMutation = useMutation({
    mutationFn: () => criarVisita({
      denunciado: denunciado.trim(),
      data_agendada: dataAgendada ? new Date(dataAgendada).toISOString() : undefined,
      fiscalizadores_ids: fiscalizadoresSelecionados,
      ...Object.fromEntries(Object.entries(estabelecimento).map(([chave, valor]) => [chave, valor.trim()]).filter(([, valor]) => valor)),
    }),
    onSuccess: (visitaCriada) => {
      void queryClient.invalidateQueries({ queryKey: ['visitas'] });
      limparSelecao();
      const id = visitaCriada?.id;
      navigate(Number.isSafeInteger(id) && id > 0 ? `/gestor/visitas/${id}` : '/');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const novosErros = validar({ denunciado, dataAgendada, fiscalizadoresSelecionados });
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0 || criarMutation.isPending) {
      return;
    }
    criarMutation.mutate();
  };

  const fiscalEscolhido = fiscalizadores.find((fiscal) => fiscalizadoresSelecionados.includes(fiscal.id));
  const dataResumo = dataAgendada && !Number.isNaN(new Date(dataAgendada).getTime())
    ? formatadorResumo.format(new Date(dataAgendada))
    : '—';
  const local = estabelecimento.nome_fantasia.trim() || denunciado.trim() || '—';
  const endereco = [estabelecimento.endereco, estabelecimento.bairro].map((valor) => valor.trim()).filter(Boolean).join(' · ') || '—';

  return (
    <article className="max-w-[1112px]" aria-labelledby="nova-visita-titulo">
      <PageHeader eyebrow="Atribuição" title="Nova visita" titleId="nova-visita-titulo" />

      <form onSubmit={handleSubmit} noValidate className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {criarMutation.isError ? (
            <ListaErros mensagens={mensagensDoErro(criarMutation.error, 'Não foi possível criar a visita. Tente novamente.')} />
          ) : null}

          <Secao numero={1} titulo="Estabelecimento">
            <label className="label" htmlFor="denunciado">Dados do denunciado *</label>
            <input
              id="denunciado"
              className={`field h-12 ${erros.denunciado ? 'field-erro' : ''}`}
              placeholder="Nome ou razão social do denunciado"
              value={denunciado}
              aria-invalid={Boolean(erros.denunciado)}
              aria-describedby={erros.denunciado ? 'erro-denunciado' : undefined}
              onChange={(e) => setDenunciado(e.target.value)}
            />
            <ErroCampo id="erro-denunciado" mensagem={erros.denunciado} />

            <p className="mt-4 text-[13px] text-muted">Os dados abaixo saem no documento da visita. Preencha o que tiver.</p>
            <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              {CAMPOS_ESTABELECIMENTO.map((campo) => (
                <div key={campo.chave}>
                  <label className="label" htmlFor={campo.chave}>{campo.rotulo}</label>
                  <input
                    id={campo.chave}
                    className="field"
                    placeholder={campo.placeholder}
                    value={estabelecimento[campo.chave]}
                    onChange={(e) => setEstabelecimento((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </Secao>

          <Secao numero={2} titulo="Fiscalizador e data">
            <div className="label" id="rotulo-fiscal">Fiscalizador * <span className="font-normal text-muted">— a barra mostra as visitas abertas de cada um</span></div>

            {usuariosQuery.isPending ? (
              <p className="text-sm text-muted" role="status">Carregando fiscalizadores...</p>
            ) : usuariosQuery.isError ? (
              <p className="text-sm text-danger" role="alert">Erro ao carregar fiscalizadores.</p>
            ) : fiscalizadores.length === 0 ? (
              <p className="text-sm text-muted">Nenhum fiscalizador cadastrado.</p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-labelledby="rotulo-fiscal">
                {fiscalizadores.map((fiscal) => {
                  const ativo = fiscalizadoresSelecionados.includes(fiscal.id);
                  const abertas = (cargas.get(fiscal.id) ?? CARGA_VAZIA).abertas;
                  return (
                    <label
                      key={fiscal.id}
                      className={`cursor-pointer rounded-xl p-[15px] ${ativo ? 'border-2 border-primary bg-selected-bg' : 'border border-border-2 bg-white'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="fiscalizador"
                          checked={ativo}
                          onChange={() => toggleFiscalizador(fiscal.id)}
                          aria-label={fiscal.nome}
                          className="h-[18px] w-[18px] accent-primary"
                        />
                        <span className="flex-1 text-[15px] font-semibold leading-tight text-ink">{fiscal.nome}</span>
                        <span className="whitespace-nowrap text-[13px] text-muted-2">{abertas} {abertas === 1 ? 'aberta' : 'abertas'}</span>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
                        <div className={`h-2 rounded-full ${corDaCarga(abertas)}`} style={{ width: larguraDaCarga(abertas) }} />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <ErroCampo id="erro-fiscal" mensagem={erros.fiscalizador} />

            <div className="mt-4 max-w-[320px]">
              <label className="label" htmlFor="data-agendada">Data agendada *</label>
              <input
                id="data-agendada"
                type="datetime-local"
                className={`field ${erros.dataAgendada ? 'field-erro' : ''}`}
                value={dataAgendada}
                aria-invalid={Boolean(erros.dataAgendada)}
                aria-describedby={erros.dataAgendada ? 'erro-data' : undefined}
                onChange={(e) => setDataAgendada(e.target.value)}
              />
              <ErroCampo id="erro-data" mensagem={erros.dataAgendada} />
            </div>
          </Secao>
        </div>

        <aside className="sticky top-8 rounded-2xl bg-navy p-6 text-white" aria-label="Resumo da visita">
          <h2 className="font-heading text-[23px] font-extrabold uppercase">Resumo</h2>
          <dl className="mt-4 grid grid-cols-[78px_1fr] gap-x-3 gap-y-2.5 text-sm">
            <dt className="text-nav-muted">Local</dt><dd className="break-words font-semibold">{local}</dd>
            <dt className="text-nav-muted">Endereço</dt><dd className="break-words font-semibold">{endereco}</dd>
            <dt className="text-nav-muted">Fiscal</dt><dd className="font-semibold">{fiscalEscolhido?.nome ?? '—'}</dd>
            <dt className="text-nav-muted">Data</dt><dd className="font-semibold">{dataResumo}</dd>
          </dl>
          <p className="mt-4 text-[13px] leading-[18px] text-nav-muted">
            A visita aparece no app do fiscalizador assim que for criada.
          </p>
          <button type="submit" disabled={criarMutation.isPending} className="mt-5 h-[52px] w-full rounded-xl bg-success text-base font-bold text-white hover:bg-success-2 disabled:opacity-60">
            {criarMutation.isPending ? 'Salvando...' : 'Atribuir visita'}
          </button>
          <Link to="/gestor/fiscalizadores" className="mt-5 block text-center text-sm font-semibold text-white underline underline-offset-2">
            Cancelar
          </Link>
        </aside>
      </form>
    </article>
  );
}
