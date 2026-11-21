import { Directory, File, Paths } from "expo-file-system";

function pastaAssinaturas() {
  const pasta = new Directory(Paths.document, "assinaturas");
  if (!pasta.exists) pasta.create({ intermediates: true, idempotent: true });
  return pasta;
}

export async function salvarImagemAssinatura(dataUrl: string, nomeArquivo: string) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const arquivo = new File(pastaAssinaturas(), `${nomeArquivo}.png`);
  arquivo.create({ overwrite: true });
  await arquivo.write(base64, { encoding: "base64" });
  return arquivo.uri;
}

export function apagarImagemAssinatura(uri: string | null) {
  if (!uri) return;
  try {
    const arquivo = new File(uri);
    if (arquivo.exists) arquivo.delete();
  } catch {
  }
}
