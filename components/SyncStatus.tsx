import { StatusSincronizacao } from "@/contexts/FeedsContext";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = {
  status: StatusSincronizacao;
};

export default function SyncStatus({ status }: Props) {
  const configuracoes = {
    aguardando: {
      texto: "Aguardando ESP32...",
      cor: "#6B7280",
    },
    sincronizando: {
      texto: "Sincronizando agendamentos...",
      cor: "#D97706",
    },
    sincronizado: {
      texto: "Agendamentos sincronizados",
      cor: "#05CFA5",
    },
    erro: {
      texto: "Erro de sincronização",
      cor: "#DC2626",
    },
  };

  const configuracao = configuracoes[status];

  return (
    <View style={styles.container}>
      {status === "aguardando" || status === "sincronizando" ? (
        <ActivityIndicator size="small" color={configuracao.cor} />
      ) : (
        <MaterialCommunityIcons
          name={status === "sincronizado" ? "check-circle" : "alert-circle"}
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
