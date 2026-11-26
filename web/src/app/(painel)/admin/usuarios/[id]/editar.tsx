import { useLocalSearchParams } from "expo-router";
import { FormularioUsuario } from "@/components/FormularioUsuario";

export default function EditarUsuarioScreen() {
  // o [id] do nome da pasta chega aqui como parâmetro da rota
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FormularioUsuario id={id} />;
}
