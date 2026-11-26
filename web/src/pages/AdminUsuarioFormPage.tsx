import { useState, type FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErroCarga, ListaErros, Mensagem, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { mensagensDoErro, statusDoErro } from '../lib/erros';
import type { Usuario } from '../types';

type Perfil = 'fiscalizador' | 'gestor';

const PERFIS: { value: Perfil; titulo: string; descricao: string }[] = [
  { value: 'fiscalizador', titulo: 'Fiscalizador', descricao: 'Usa o app no celular. Recebe e executa visitas em campo.' },
  { value: 'gestor', titulo: 'Gestor', descricao: 'Usa o painel web. Cria e acompanha as visitas da equipe.' },
];

const SENHA_MINIMA = 6;

async function criarUsuario(dados: Record<string, unknown>) {
  const response = await api.post<Usuario>('/usuarios', dados);
  return response.data;
}

async function buscarUsuario(id: string, signal?: AbortSignal) {
  const response = await api.get<Usuario>(`/usuarios/${id}`, { signal });
  return response.data;
}

async function atualizarUsuario(id: string, dados: Record<string, unknown>) {
  const response = await api.put<Usuario>(`/usuarios/${id}`, dados);
  return response.data;
}

export default function AdminUsuarioFormPage() {
  const { id } = useParams();

  const usuarioQuery = useQuery({
    queryKey: ['usuario', id],
    queryFn: ({ signal }) => buscarUsuario(id!, signal),
    enabled: !!id,
  });

  if (id && usuarioQuery.isPending) {
    return <Mensagem carregando>Carregando usuário...</Mensagem>;
  }

  if (id && usuarioQuery.isError) {
    return (
      <div className="max-w-[780px]">
        <ErroCarga
          mensagem={statusDoErro(usuarioQuery.error) === 404 ? 'Usuário não encontrado.' : 'Erro ao carregar usuário.'}
          onTentar={() => usuarioQuery.refetch()}
          tentando={usuarioQuery.isFetching}
        />
      </div>
    );
  }

  return <UsuarioForm key={id ?? 'novo'} id={id} usuario={usuarioQuery.data} />;
}

function UsuarioForm({ id, usuario }: { id?: string; usuario?: Usuario }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdicao = !!id;
  const [perfil, setPerfil] = useState<Perfil>(usuario?.role === 'gestor' ? 'gestor' : 'fiscalizador');
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [matricula, setMatricula] = useState(usuario?.matricula ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [senha, setSenha] = useState('');

  const senhaCurta = senha.length > 0 && senha.trim().length < SENHA_MINIMA;

  const salvarMutation = useMutation({
    mutationFn: () => {
      const dados: Record<string, unknown> = { nome: nome.trim(), email: email.trim(), role: perfil };
      if (!isEdicao) {
        return criarUsuario({ ...dados, senha, ...(matricula.trim() && { matricula: matricula.trim() }) });
      }
      dados.matricula = matricula.trim() || null;
      if (senha) {
        dados.senha = senha;
      }
      return atualizarUsuario(id!, dados);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      if (isEdicao) {
        void queryClient.invalidateQueries({ queryKey: ['usuario', id] });
      }
      navigate('/admin/usuarios');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (senhaCurta || salvarMutation.isPending) return;
    salvarMutation.mutate();
  };

  return (
    <article className="max-w-[780px]" aria-labelledby="usuario-form-titulo">
      <Link to="/admin/usuarios" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <ChevronLeft size={16} aria-hidden="true" /> Usuários
      </Link>
      <PageHeader title={isEdicao ? 'Editar usuário' : 'Novo usuário'} titleId="usuario-form-titulo">
        <p className="mt-2 text-[15px] text-muted">
          {isEdicao
            ? 'Altere os dados do servidor. Deixe a senha em branco para manter a atual.'
            : 'Informe uma senha inicial e repasse ao servidor; ele entra com o e-mail e essa senha.'}
        </p>
      </PageHeader>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {salvarMutation.isError ? (
          <ListaErros mensagens={mensagensDoErro(salvarMutation.error, 'Não foi possível salvar o usuário. Tente novamente.')} />
        ) : null}

        <section className="card p-7">
          <h2 className="titulo-card">Perfil de acesso</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Perfil">
            {PERFIS.map((opcao) => {
              const ativo = perfil === opcao.value;
              return (
                <label
                  key={opcao.value}
                  className={`flex cursor-pointer gap-3 rounded-[14px] p-[18px] ${ativo ? 'border-2 border-primary bg-selected-bg' : 'border border-border-2 bg-white'}`}
                >
                  <input type="radio" name="perfil" value={opcao.value} checked={ativo} onChange={() => setPerfil(opcao.value)} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span>
                    <span className="block text-[15px] font-bold text-ink">{opcao.titulo}</span>
                    <span className="mt-1 block text-sm leading-[19.6px] text-muted">{opcao.descricao}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="card p-7">
          <h2 className="titulo-card">Dados do servidor</h2>

          <label className="label mt-5" htmlFor="nome">Nome completo</label>
          <input id="nome" className="field" required value={nome} placeholder="Nome completo" onChange={(e) => setNome(e.target.value)} />

          <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="matricula">
                Matrícula <span className="font-normal text-muted">(sai no documento da visita)</span>
              </label>
              <input id="matricula" className="field" value={matricula} placeholder="ex.: 104512" onChange={(e) => setMatricula(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" type="email" className="field" required value={email} placeholder="email@exemplo.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="senha">
                Senha {isEdicao ? <span className="font-normal text-muted">(opcional)</span> : null}
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="new-password"
                className={`field ${senhaCurta ? 'field-erro' : ''}`}
                required={!isEdicao}
                value={senha}
                placeholder={isEdicao ? 'Deixe em branco para manter a atual' : 'Digite uma senha'}
                aria-invalid={senhaCurta}
                onChange={(e) => setSenha(e.target.value)}
              />
              <p className={`mt-2 text-[13px] ${senhaCurta ? 'font-medium text-danger' : 'text-muted'}`}>
                Mínimo de {SENHA_MINIMA} caracteres.
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2.5">
          <Link to="/admin/usuarios" className="inline-flex h-[50px] items-center rounded-xl border border-border-2 bg-white px-[22px] text-[15px] font-semibold text-ink">
            Cancelar
          </Link>
          <button type="submit" disabled={salvarMutation.isPending} className="btn-primary h-[50px] rounded-xl px-[22px] text-[15px]">
            {salvarMutation.isPending ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Cadastrar usuário'}
          </button>
        </div>
      </form>
    </article>
  );
}
