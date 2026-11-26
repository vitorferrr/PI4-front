import { PageHeader, Mensagem } from "@/components/ui";

export function EmConversao({ titulo }: { titulo: string }) {
  return (
    <>
      <PageHeader title={titulo} />
      <Mensagem>Esta tela está sendo convertida para React Native.</Mensagem>
    </>
  );
}
