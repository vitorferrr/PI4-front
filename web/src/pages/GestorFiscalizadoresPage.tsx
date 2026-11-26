import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, ErroCarga, Mensagem, PageHeader } from '../components/ui';
import { buscarUsuarios, buscarVisitas } from '../lib/consultas';
import { statusDoErro } from '../lib/erros';
import { calcularCargas, CARGA_VAZIA, corDaCarga, iniciais, larguraDaCarga, normalizarPesquisa } from '../lib/visitas';

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-[3px] ${cor}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Stat({ valor, label, destaque }: { valor: number; label: string; destaque?: boolean }) {
  return (
    <div className="rounded-[10px] bg-app px-2 py-2.5 text-center">
      <div className={`text-[17px] font-bold ${destaque ? 'text-danger' : 'text-ink'}`}>{valor}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export default function GestorFiscalizadoresPage() {
  const [busca, setBusca] = useState('');
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
  const termo = normalizarPesquisa(busca);
  const lista = fiscalizadores.filter((fiscal) => normalizarPesquisa(`${fiscal.nome} ${fiscal.matricula ?? ''}`).includes(termo));

  return (
    <article className="max-w-[1112px]" aria-labelledby="fiscalizadores-titulo">
      <PageHeader
        eyebrow={usuariosQuery.data ? `${fiscalizadores.length} ${fiscalizadores.length === 1 ? 'fiscalizador' : 'fiscalizadores'}` : 'Equipe'}
        title="Sua equipe em campo"
        titleId="fiscalizadores-titulo"
        actions={(
          <>
            <input
              type="search"
              className="field h-11 w-60 text-sm"
              placeholder="Buscar fiscalizador"
              aria-label="Buscar fiscalizador"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Link to="/gestor/visitas/nova" className="btn-primary h-[44px]">
              <Plus size={18} aria-hidden="true" /> Atribuir visita
            </Link>
          </>
        )}
      />

      <div className="mt-6 flex flex-wrap gap-6 text-[13px] text-muted-2">
        <Legenda cor="bg-[#2f9e5b]" label="Carga leve (até 3 abertas)" />
        <Legenda cor="bg-[#1677d2]" label="Carga normal (4–5)" />
        <Legenda cor="bg-[#d9a400]" label="Sobrecarga (6+)" />
      </div>

      {visitasQuery.isError ? (
        <div className="mt-4">
          <ErroCarga mensagem="Não foi possível carregar as visitas; a carga de cada fiscal pode estar incompleta." onTentar={() => visitasQuery.refetch()} tentando={visitasQuery.isFetching} />
        </div>
      ) : null}

      {usuariosQuery.isPending ? (
        <Mensagem carregando>Carregando fiscalizadores...</Mensagem>
      ) : usuariosQuery.isError ? (
        <div className="mt-6">
          <ErroCarga
            mensagem={statusDoErro(usuariosQuery.error) === 403 ? 'Você não tem permissão para consultar a equipe.' : 'Erro ao carregar fiscalizadores.'}
            onTentar={() => usuariosQuery.refetch()}
            tentando={usuariosQuery.isFetching}
          />
        </div>
      ) : fiscalizadores.length === 0 ? (
        <Mensagem>Nenhum fiscalizador cadastrado.</Mensagem>
      ) : lista.length === 0 ? (
        <Mensagem>Nenhum fiscalizador encontrado.</Mensagem>
      ) : (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Fiscalizadores">
          {lista.map((fiscal) => {
            const carga = cargas.get(fiscal.id) ?? CARGA_VAZIA;
            const primeiroNome = fiscal.nome.trim().split(/\s+/)[0];
            return (
              <article key={fiscal.id} className="card p-[23px]">
                <div className="flex items-center gap-3">
                  <Avatar iniciais={iniciais(fiscal.nome)} size={48} />
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-bold text-ink">{fiscal.nome}</h2>
                    <div className="truncate text-[13px] text-muted">
                      {fiscal.matricula?.trim() ? `Mat. ${fiscal.matricula}` : 'Sem matrícula'} · {fiscal.email}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-2">Visitas abertas</span>
                  <span className="font-bold text-ink">{carga.abertas}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                  <div className={`h-2.5 rounded-full ${corDaCarga(carga.abertas)}`} style={{ width: larguraDaCarga(carga.abertas) }} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat valor={carga.vencemHoje} label="para hoje" />
                  <Stat valor={carga.atrasadas} label="atrasadas" destaque={carga.atrasadas > 0} />
                  <Stat valor={carga.noMes} label="concluídas no mês" />
                </div>

                <Link
                  to={`/gestor/visitas/nova?fiscal=${fiscal.id}`}
                  className="mt-4 flex h-[46px] items-center justify-center rounded-[10px] border border-border-2 text-sm font-bold text-primary hover:bg-selected-bg"
                >
                  Atribuir a {primeiroNome}
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </article>
  );
}
