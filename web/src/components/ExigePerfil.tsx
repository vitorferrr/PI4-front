import { Redirect, Slot } from "expo-router";
import { useSession } from "@/lib/session";
import type { Role } from "@/types";

export function ExigePerfil({ perfis }: { perfis: Role[] }) {
  const role = useSession((state) => state.claims?.role);

  if (!perfis.includes(role as Role)) return <Redirect href="/" />;

  return <Slot />;
}
