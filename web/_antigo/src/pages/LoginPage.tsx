import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isCancel } from 'axios';
import { api } from '../lib/api';
import { mensagensDoErro, statusDoErro } from '../lib/erros';
import { isTokenValid, startSession, useSession } from '../lib/session';
import { DecorativeStrip, LogoMark } from '../components/ui';

async function fazerLogin(email: string, senha: string) {
  const response = await api.post('/auth/login', { email, senha }, { skipAuth: true });
  startSession(response.data?.token, response.data?.usuario);
}

function mensagemDoLogin(erro: unknown) {
  const status = statusDoErro(erro);
  if (status === 401) return 'E-mail ou senha inválidos';
  if (status === 403) return mensagensDoErro(erro, 'Cadastro aguardando aprovação de um administrador')[0];
  return 'Não foi possível entrar. Tente novamente.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const token = useSession((state) => state.token);
  const usuarioId = useSession((state) => state.claims?.id);
  const location = useLocation();
  const from = location.state?.from;
  const de = location.state?.de;
  const mesmaPessoa = de === undefined || de === usuarioId;
  const returnPath = mesmaPessoa && typeof from === 'string' && from.startsWith('/')
    && !from.startsWith('//') && !from.includes('\\') && !/^\/login(?:[/?#]|$)/.test(from)
    ? from : '/';

  const loginMutation = useMutation({
    mutationFn: () => fazerLogin(email, password),
  });
  const erro = loginMutation.isError && !isCancel(loginMutation.error) ? mensagemDoLogin(loginMutation.error) : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loginMutation.isPending) loginMutation.mutate();
  };

  if (isTokenValid(token)) {
    return <Navigate to={returnPath} replace />;
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,760px)_1fr]">
      <section className="relative hidden flex-col overflow-hidden bg-accent lg:flex">
        <DecorativeStrip />
        <div className="flex flex-1 flex-col px-14 pb-12 pt-12">
          <div className="flex items-center gap-3">
            <LogoMark size={48} variant="navy" />
            <div>
              <div className="font-heading text-[34px] font-black uppercase leading-[34px] tracking-[0.02em] text-navy">Constata</div>
              <div className="text-sm font-semibold text-navy">Procon Jaboatão dos Guararapes</div>
            </div>
          </div>

          <p className="mt-12 font-heading font-black uppercase text-navy" aria-hidden="true">
            <span className="block text-[84px] leading-[80px]">Fiscalização</span>
            <span className="mt-1 inline-block rounded-[10px] bg-navy px-3.5 text-[84px] leading-[101px] text-accent">sem papel.</span>
          </p>

          <p className="mt-6 max-w-[430px] text-[19px] font-medium leading-[28.5px] text-navy">
            Da denúncia ao documento assinado, com cada visita registrada em campo, geolocalizada e pronta para análise.
          </p>

          <div className="mt-6 self-start rounded-xl bg-white px-5 py-2">
            <span className="font-heading text-2xl font-extrabold uppercase text-navy">Tudo num só painel</span>
          </div>

          <p className="mt-auto pt-10 text-sm font-medium text-navy">
            Acesso restrito a servidores do Procon. Problemas para entrar? Fale com a coordenação.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-[#f3f6fb] px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[420px] rounded-[20px] border border-[#dce3ef] bg-white p-10 shadow-[0_20px_24px_rgba(23,47,110,0.1)]"
        >
          <h1 className="h-display text-4xl">Entrar</h1>
          <p className="mt-1.5 text-[15px] text-muted">Use seu e-mail e senha cadastrados.</p>

          <label className="label mt-5" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="field border-border"
            placeholder="nome@jaboatao.pe.gov.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="label mt-5" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            required
            className="field border-border"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {erro ? (
            <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger-text">{erro}</p>
          ) : null}

          <button type="submit" disabled={loginMutation.isPending} className="btn-primary mt-6 h-[52px] w-full rounded-xl text-base">
            {loginMutation.isPending ? 'Entrando...' : 'Entrar no painel'}
          </button>
        </form>
      </section>
    </div>
  );
}
