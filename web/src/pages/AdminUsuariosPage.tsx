import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, ErroCarga, ListaErros, Mensagem, PageHeader, PerfilBadge } from '../components/ui';
import { api } from '../lib/api';
import { buscarUsuarios, buscarVisitas } from '../lib/consultas';
import { mensagensDoErro, statusDoErro } from '../lib/erros';
import { calcularCargas, iniciais, normalizarPesquisa } from '../lib/visitas';
import type { Usuario } from '../types';

type Filtro = 'todos' | 'gestor' | 'fiscalizador';
type Acao = 'aprovar' | 'reprovar' | 'excluir';

const ROLES_LISTADOS = ['gestor', 'fiscalizador'];

const ACOES: Record<Acao, { confirmar: (nome: string) => string; executar: (id: number) => Promise<unknown>; erro: string }> = {
  aprovar: {
    confirmar: (nome) => `Aprovar o cadastro de ${nome}? A pessoa passa a conseguir entrar no app.`,
    executar: (id) => api.patch(`/usuarios/${id}/aprovar`),
    erro: 'Não foi possível aprovar o usuário.',
  },
  reprovar: {
    confirmar: (nome) => `Bloquear ${nome}? O cadastro não é apagado, mas o login fica bloqueado até nova aprovação.`,
    executar: (id) => api.patch(`/usuarios/${id}/reprovar`),
    erro: 'Não foi possível bloquear o usuário.',
  },
  excluir: {
    confirmar: (nome) => `Excluir o usuário ${nome}?`,
    executar: (id) => api.delete(`/usuarios/${id}`),
    erro: 'Não foi possível excluir o usuário.',
  },
};

function StatusAprovacao({ usuario }: { usuario: Usuario }) {
  const ativo = usuario.aprovado !== false;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${ativo ? 'text-success' : 'text-warn'}`}>
      <span className={`h-2 w-2 rounded-full ${ativo ? 'bg-success' : 'bg-[#d9a400]'}`} aria-hidden="true" />
      {ativo ? 'Ativo' : 'Aguardando aprovação'}
    </span>
  );
}

export default function AdminUsuariosPage() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [soPendentes, setSoPendentes] = useState(false);
  const queryClient = useQueryClient();

  const usuariosQuery = useQuery({
    queryKey: ['usuarios'],
    queryFn: ({ signal }) => buscarUsuarios(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ['visitas'],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });

  const acaoMutation = useMutation({
    mutationFn: ({ acao, id }: { acao: Acao; id: number }) => ACOES[acao].executar(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const executar = (acao: Acao, usuario: Usuario) => {
    if (acaoMutation.isPending) return;
    if (window.confirm(ACOES[acao].confirmar(usuario.nome))) {
      acaoMutation.mutate({ acao, id: usuario.id });
    }
  };

  const todos = (usuariosQuery.data ?? []).filter((usuario) => ROLES_LISTADOS.includes(usuario.role));
  const cargas = calcularCargas(visitasQuery.data ?? []);
  const termo = normalizarPesquisa(busca);
  const lista = todos.filter((usuario) => (
    (filtro === 'todos' || usuario.role === filtro)
    && (!soPendentes || usuario.aprovado === false)
    && (!termo || [usuario.nome, usuario.email, usuario.matricula].some((valor) => normalizarPesquisa(valor).includes(termo)))
  ));
  const contar = (role: Filtro) => todos.filter((usuario) => role === 'todos' || usuario.role === role).length;
  const pendentes = todos.filter((usuario) => usuario.aprovado === false).length;
  const segmentos: { key: Filtro; label: string }[] = [
    { key: 'todos', label: `Todos · ${contar('todos')}` },
    { key: 'gestor', label: `Gestores · ${contar('gestor')}` },
    { key: 'fiscalizador', label: `Fiscalizadores · ${contar('fiscalizador')}` },
  ];
  const erroAcao = acaoMutation.isError
    ? mensagensDoErro(acaoMutation.error, ACOES[acaoMutation.variables!.acao].erro)
    : [];

  return (
    <article className="max-w-[1112px]" aria-labelledby="usuarios-titulo">
      <PageHeader
        eyebrow="Gestão de usuários"
        title="Gestores e fiscalizadores"
        titleId="usuarios-titulo"
        actions={(
          <Link to="/admin/usuarios/novo" className="btn-primary h-[44px]">
            <Plus size={18} aria-hidden="true" /> Novo usuário
          </Link>
        )}
      />

      {pendentes > 0 ? (
        <button
          type="button"
          onClick={() => setSoPendentes(true)}
          className="mt-6 flex w-full items-center gap-3 rounded-[14px] bg-warn-bg px-[18px] py-4 text-left text-[15px] text-warn-text"
        >
          <b>{pendentes} {pendentes === 1 ? 'cadastro aguardando' : 'cadastros aguardando'} aprovação.</b>
          <span className="link text-warn-text">Ver pendentes</span>
        </button>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="relative min-w-[280px] flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className="field h-12 pl-[42px]"
            placeholder="Buscar por nome, matrícula ou e-mail"
            aria-label="Buscar usuários"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex rounded-xl bg-[#e3ebf4] p-1" role="group" aria-label="Filtrar por perfil">
          {segmentos.map((segmento) => (
            <button
              key={segmento.key}
              type="button"
              aria-pressed={filtro === segmento.key}
              onClick={() => setFiltro(segmento.key)}
              className={`h-10 rounded-[9px] px-3.5 text-sm ${filtro === segmento.key ? 'bg-white font-bold text-navy shadow-sm' : 'font-semibold text-muted-2'}`}
            >
              {segmento.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-2">
          <input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} className="h-[18px] w-[18px] accent-primary" />
          Só aguardando aprovação
        </label>
      </div>

      {erroAcao.length > 0 ? <div className="mt-4"><ListaErros mensagens={erroAcao} /></div> : null}

      <div className="card mt-6 overflow-x-auto">
        {usuariosQuery.isPending ? (
          <Mensagem carregando>Carregando usuários...</Mensagem>
        ) : usuariosQuery.isError ? (
          <div className="p-5">
            <ErroCarga
              mensagem={statusDoErro(usuariosQuery.error) === 403 ? 'Você não tem permissão para consultar os usuários.' : 'Erro ao carregar usuários.'}
              onTentar={() => usuariosQuery.refetch()}
              tentando={usuariosQuery.isFetching}
            />
          </div>
        ) : todos.length === 0 ? (
          <Mensagem>Nenhum gestor ou fiscalizador cadastrado.</Mensagem>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-table-head text-muted">
              <tr>
                {['Nome', 'Matrícula', 'Perfil', 'Visitas abertas', 'Status'].map((titulo) => (
                  <th key={titulo} scope="col" className="px-5 py-3.5 font-semibold">{titulo}</th>
                ))}
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((usuario) => (
                <tr key={usuario.id} className="border-t border-row-line">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar iniciais={iniciais(usuario.nome)} />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink">{usuario.nome}</div>
                        <div className="text-[13px] text-muted">{usuario.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink">{usuario.matricula?.trim() || '—'}</td>
                  <td className="px-5 py-3"><PerfilBadge role={usuario.role} /></td>
                  <td className="px-5 py-3 text-ink">
                    {usuario.role === 'fiscalizador' && visitasQuery.data ? cargas.get(usuario.id)?.abertas ?? 0 : '—'}
                  </td>
                  <td className="px-5 py-3"><StatusAprovacao usuario={usuario} /></td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-3">
                      {usuario.aprovado === false ? (
                        <button type="button" className="link text-success" disabled={acaoMutation.isPending} onClick={() => executar('aprovar', usuario)}>Aprovar</button>
                      ) : usuario.role === 'fiscalizador' ? (
                        <button type="button" className="link text-warn" disabled={acaoMutation.isPending} onClick={() => executar('reprovar', usuario)}>Bloquear</button>
                      ) : null}
                      <Link to={`/admin/usuarios/${usuario.id}/editar`} className="link">Editar</Link>
                      <button type="button" className="link text-danger" disabled={acaoMutation.isPending} onClick={() => executar('excluir', usuario)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">Nenhum usuário encontrado.</td></tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {todos.length > 0 ? (
        <p className="mt-4 text-sm text-muted" role="status">Mostrando {lista.length} de {todos.length} usuários.</p>
      ) : null}
    </article>
  );
}
