import { api } from './api';

export interface FiltrosExportacao {
  status?: string;
  gestor_id?: string;
  fiscalizador_id?: string;
}

// O CSV é gerado pelo back com os mesmos filtros de status, gestor e fiscalizador.
export async function exportarVisitas(filtros: FiltrosExportacao = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
  const response = await api.get<Blob>('/admin/exportar', { params, responseType: 'blob' });
  return {
    arquivo: response.data,
    total: Number(response.headers?.['x-total-count']) || 0,
    truncado: response.headers?.['x-truncated'] === 'true',
  };
}

// O link precisa estar na página e a URL não pode ser liberada logo em seguida:
// no Firefox e no Safari isso pode ignorar o clique ou cancelar o download.
export function baixarArquivo(arquivo: Blob, nome: string) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
