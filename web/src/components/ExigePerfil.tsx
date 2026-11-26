import { Redirect, Slot } from "expo-router";
import { useSessaoStore } from "@/store/sessaoStore";
import type { Role } from "@/types/usuario";

export function ExigePerfil({ perfis }: { perfis: Role[] }) {
  const role = useSessaoStore((state) => state.usuario?.role);

  if (!role || !perfis.includes(role)) return <Redirect href="/" />;

  return <Slot />;
}
