export function lerUsuarioIdDoToken(token: string | null): number | null {
  if (!token) return null;

  const partes = token.split(".");
  if (partes.length !== 3) return null;

  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const base64Completo = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const dados = JSON.parse(atob(base64Completo));
    return typeof dados.id === "number" ? dados.id : null;
  } catch {
    return null;
  }
}
