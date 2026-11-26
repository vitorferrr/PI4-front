import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import { useUsuario } from "@/hooks/use-usuario";
import { FormularioUsuario } from "@/components/FormularioUsuario";
import { MensagemErro } from "@/components/MensagemErro";

export default function EditarUsuarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useUsuario(id);

  if (isPending) return <ActivityIndicator size="large" />;
  if (isError)
    return <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />;

  return <FormularioUsuario key={data.id} usuario={data} />;
}
