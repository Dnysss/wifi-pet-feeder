import { StatusSincronizacao } from "@/contexts/FeedsContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = {
  status: StatusSincronizacao;
  online: boolean;
};

export default function SyncStatus({ status, online }: Props) {
  const configuracoes = {
    aguardando: {
      texto: "Aguardando ESP32...",
      cor: "#6B7280",
      icone: "clock-outline",
    },
    sincronizando: {
      texto: "Sincronizando agendamentos...",
      cor: "#D97706",
      icone: "sync",
    },
    verificando: {
      texto: "Verificando salvamento no ESP32...",
      cor: "#D97706",
      icone: "database-search",
    },
    sincronizado: {
      texto: "Agendamentos sincronizados",
      cor: "#05CFA5",
      icone: "check-circle",
    },
    erro: {
      texto: "Erro de sincronização",
      cor: "#DC2626",
      icone: "alert-circle",
    },
  } as const;

  const configuracao = !online
    ? {
        texto: "ESP32 desconectado",
        cor: "#DC2626",
        icone: "wifi-off" as const,
      }
    : configuracoes[status];

  const carregando =
    online && (status === "aguardando" || status === "sincronizando" || status === "verificando");

  return (
    <View style={styles.container}>
      {carregando ? (
        <ActivityIndicator size="small" color={configuracao.cor} />
      ) : (
        <MaterialCommunityIcons
          name={configuracao.icone}
          size={20}
          color={configuracao.cor}
        />
      )}

      <Text style={[styles.texto, { color: configuracao.cor }]}>
        {configuracao.texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  texto: {
    fontSize: 13,
    fontWeight: "500",
  },
});
