import { NativeTabs } from "expo-router/native-tabs";
import { cores } from "@/theme";

export default function AbasLayout() {
  return (
    <NativeTabs tintColor={cores.azul}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Visitas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.clipboard" md="assignment" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sobre">
        <NativeTabs.Trigger.Label>Sobre</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="info.circle" md="info" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
