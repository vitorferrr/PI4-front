import { isAxiosError } from 'axios';
import type { ErroApi } from '../types';

export function statusDoErro(erro: unknown) {
  return isAxiosError(erro) ? erro.response?.status : (erro as { response?: { status?: number } })?.response?.status;
}

export function mensagensDoErro(erro: unknown, padrao: string) {
  const resposta = (isAxiosError(erro) ? erro.response?.data : undefined) as ErroApi | undefined;
  if (!resposta?.mensagem) return [padrao];
  const detalhes = (resposta.erros ?? []).filter((item) => typeof item === 'string' && item !== resposta.mensagem);
  return [resposta.mensagem, ...detalhes];
}
