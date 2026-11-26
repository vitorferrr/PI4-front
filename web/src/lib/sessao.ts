let controle = new AbortController();

export function sinalDaSessao() {
  return controle.signal;
}

export function cancelarRequisicoes() {
  controle.abort();
  controle = new AbortController();
}

export function expiracaoDoToken(token: string | null) {
  const partes = token?.split(".") ?? [];
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = JSON.parse(atob(base64)).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenValido(token: string | null) {
  const expiracao = expiracaoDoToken(token);
  return expiracao !== null && expiracao > Date.now();
}
