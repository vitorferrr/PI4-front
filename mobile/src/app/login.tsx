import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useSessaoStore } from "@/store/sessaoStore";
import { API_URL } from "../lib/api";

async function fazerLogin(email: string, senha: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
    });

    if (!response.ok) {
        throw new Error("E-mail ou senha inválidos");
    }

    const data = await response.json();

    // O app é só do fiscalizador, admin e gestor usam o sistema web.
    if (data.usuario?.role !== "fiscalizador") {
        throw new Error("Este aplicativo é exclusivo para fiscalizadores.");
    }

    return data;
}

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const entrar = useSessaoStore((state) => state.entrar);

    const loginMutation = useMutation ({
        mutationFn: () => fazerLogin(email, senha),
        onSuccess: async (data) => {
            await entrar(data.token);
        },
    });
    

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>PROCON Jaboatão</Text>

            <TextInput 
                style={styles.input}
                placeholder="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput 
                style={styles.input}
                placeholder="Senha"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
            />

            {loginMutation.isError && (
                <Text style={styles.erro}>{loginMutation.error.message}</Text>
            )}

            <Pressable
                style={styles.botao}
                onPress={() => loginMutation.mutate()}
                disabled={loginMutation.isPending}
            >
                {loginMutation.isPending ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={styles.botaoTexto}>Entrar</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        gap: 12,
    },
    titulo: {
        fontSize: 24,
        fontWeight: "600",
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
    },
    botao: {
        backgroundColor: "#1F3864",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    botaoTexto: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    erro: { 
        color: "#c0392b", 
        textAlign: "center" },
});