import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import SyncStatus from "@/components/SyncStatus";
import { useFeeds } from "@/hooks/useFeeds";
import { useMqtt } from "@/hooks/useMqtt";
import {
  MqttService,
  SalvamentoPendenteError,
} from "@/services/mqtt/MqttService";
import { Feed } from "@/types/feed";
import FeedCard from "../components/FeedCard";

export default function WifiPetFeeder() {
  const params = useLocalSearchParams();
  const {
    feeds,
    addFeed,
    toggleFeed,
    removeFeed,
    salvando,
    statusSincronizacao,
  } = useFeeds();
  const { status, enviarComando, presenca } = useMqtt();

  const [manualFeedVisible, setManualFeedVisible] = useState(false);
  const [manualFeedTime, setManualFeedTime] = useState(5);
  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const ultimoNewFeedProcessado = useRef<string | null>(null);

  const alimentadorOnline = presenca === "online";
  const mqttService = MqttService.getInstance();

  const verificarConexao = () => {
    if (!mqttService.espEstaOnline()) {
      Alert.alert(
        "Alimentador desconectado",
        "Conecte o alimentador à internet para gerenciar os agendamentos.",
      );

      return false;
    }

    return true;
  };

  //le parametros da rota quando um novo agendamento eh criado
  useEffect(() => {
    const parametro = params.newFeed;

    if (typeof parametro !== "string" || !parametro) {
      return;
    }

    // Impede processar duas vezes o mesmo parâmetro
    if (ultimoNewFeedProcessado.current === parametro) {
      return;
    }

    ultimoNewFeedProcessado.current = parametro;

    // Remove o parâmetro da rota
    router.setParams({ newFeed: undefined });

    try {
      const parsedData = JSON.parse(parametro);

      const newFeedData: Feed = {
        id: parsedData.id || Date.now().toString(),
        time: parsedData.time || "00:00",
        portions: Number(parsedData.portions) || 5,
        enabled: parsedData.enabled ?? true,
        days: Array.isArray(parsedData.days) ? parsedData.days : [],
      };

      if (!mqttService.espEstaOnline()) {
        Alert.alert(
          "Alimentador desconectado",
          "Não foi possível salvar porque o alimentador está offline.",
        );
        return;
      }

      void (async () => {
        try {
          console.log("Iniciando salvamento:", newFeedData.id);

          await addFeed(newFeedData);

          console.log(
            "Agendamento salvo e confirmado pelo ESP32:",
            newFeedData.id,
          );
        } catch (error) {
          if (error instanceof SalvamentoPendenteError) {
            console.warn(
              "Agendamento enviado. Aguardando confirmação pela NVS.",
            );
          } else {
            console.error("Falha ao adicionar agendamento:", error);
          }
        }
      })();
    } catch (error) {
      console.error("Erro ao ler parâmetro:", error);
    }
  }, [params.newFeed, alimentadorOnline, addFeed]);

  const handleDeleteFeed = () => {
    if (!selectedFeed) return;
    if (!verificarConexao()) return;

    Alert.alert(
      "Excluir programação",
      `Deseja excluir a programação das ${selectedFeed.time}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!verificarConexao() || !selectedFeed) return;

            try {
              await removeFeed(selectedFeed.id);

              //fecha o modal somente depos a confirmacao do ESP32
              setSelectedFeed(null);

              console.log("Agendamento excluído com sucesso.");
            } catch (error) {
              console.error("Falha ao excluir agendamento:", error);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.greenArea}>
        <Pressable style={styles.settingsButton}>
          <Feather name="settings" size={20} color="#087D6B" />
        </Pressable>
        <Pressable style={styles.layersButton}>
          <MaterialCommunityIcons
            name="layers-outline"
            size={21}
            color="#087D6B"
          />
        </Pressable>
        <Pressable
          style={styles.manualButton}
          onPress={() => setManualFeedVisible(true)}
        >
          <Text style={styles.manualText}>Manual Feed</Text>
        </Pressable>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            presenca === "online" &&
              status === "alimentando" &&
              styles.statusAlimentando,
            presenca !== "online" && styles.statusDesconectado,
          ]}
        />

        <Text style={styles.statusText}>
          {presenca === "offline"
            ? "Alimentador desconectado"
            : presenca === "desconhecido"
              ? "Verificando conexão..."
              : status === "alimentando"
                ? "Alimentando..."
                : "Alimentador pronto"}
        </Text>
      </View>

      <SyncStatus status={statusSincronizacao} online={alimentadorOnline} />

      <View style={styles.bottomArea}>
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedList}
          showsVerticalScrollIndicator={false}
        >
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              time={feed.time}
              days={Array.isArray(feed.days) ? feed.days.join(", ") : feed.days}
              portions={feed.portions}
              enabled={feed.enabled}
              onToggle={async () => {
                if (!verificarConexao()) return;

                try {
                  await toggleFeed(feed.id);

                  console.log("Status do agendamento atualizado.");
                } catch (error) {
                  console.error("Falha ao alterar agendamento:", error);
                }
              }}
              onPress={() => setSelectedFeed(feed)}
            />
          ))}
        </ScrollView>

        <Pressable
          style={styles.addButton}
          disabled={salvando}
          onPress={() => {
            if (!verificarConexao()) return;

            router.push("/add-feed");
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      <Modal
        visible={manualFeedVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualFeedVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.manualModal}>
            <Text style={styles.manualModalTitle}>Alimentação manual</Text>
            <Text style={styles.manualModalDescription}>
              Escolha por quanto tempo o motor deve funcionar.
            </Text>
            <View style={styles.manualTimeContainer}>
              <Pressable
                style={styles.timeButton}
                onPress={() => setManualFeedTime((t) => Math.max(1, t - 1))}
              >
                <Text style={styles.timeButtonText}>−</Text>
              </Pressable>
              <Text style={styles.manualTime}>{manualFeedTime}s</Text>
              <Pressable
                style={styles.timeButton}
                onPress={() => setManualFeedTime((t) => Math.min(60, t + 1))}
              >
                <Text style={styles.timeButtonText}>+</Text>
              </Pressable>
            </View>
            <View style={styles.manualActions}>
              <Pressable
                style={styles.cancelManualButton}
                onPress={() => setManualFeedVisible(false)}
              >
                <Text style={styles.cancelManualText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.confirmManualButton}
                onPress={() => {
                  enviarComando(manualFeedTime);
                  setManualFeedVisible(false);
                }}
              >
                <Text style={styles.confirmManualText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhes/Excluir */}
      <Modal
        visible={!!selectedFeed}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFeed(null)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setSelectedFeed(null)}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Programação</Text>
            {selectedFeed && (
              <>
                <Text style={styles.modalInfo}>{selectedFeed.time}</Text>
                <Text style={styles.modalSubtitle}>
                  {Array.isArray(selectedFeed.days)
                    ? selectedFeed.days.join(", ")
                    : selectedFeed.days}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Duração: {selectedFeed.portions} segundos
                </Text>
              </>
            )}
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.editButton}
                onPress={() => {
                  if (!verificarConexao()) return;

                  setSelectedFeed(null);

                  //futuramente tela de edicao
                }}
              >
                <Text style={styles.editButtonText}>Editar</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={handleDeleteFeed}>
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setSelectedFeed(null)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  greenArea: {
    height: 120,
    backgroundColor: "#05CFA5",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  settingsButton: {
    padding: 8,
  },
  layersButton: {
    padding: 8,
  },
  manualButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  manualText: { color: "#087D6B", fontWeight: "600" },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFFFFF",
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#05CFA5",
    marginRight: 10,
  },
  statusAlimentando: { backgroundColor: "#FFB800" },
  statusDesconectado: { backgroundColor: "#FF3B30" },
  statusText: { fontSize: 14, color: "#333" },
  bottomArea: { flex: 1 },
  feedScroll: { flex: 1 },
  feedList: { padding: 15 },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#05CFA5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  manualModal: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  manualModalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  manualModalDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  manualTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timeButton: {
    padding: 10,
    backgroundColor: "#EEE",
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  manualTime: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  manualActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelManualButton: {
    padding: 10,
  },
  cancelManualText: {
    color: "#666",
  },
  confirmManualButton: {
    padding: 10,
    backgroundColor: "#05CFA5",
    borderRadius: 8,
  },
  confirmManualText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalInfo: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginVertical: 2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 15,
  },
  editButton: {
    padding: 10,
    backgroundColor: "#EEE",
    borderRadius: 8,
  },
  editButtonText: {
    color: "#333",
  },
  deleteButton: {
    padding: 10,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#FFF",
  },
  cancelButton: {
    marginTop: 5,
  },
  cancelButtonText: {
    color: "#666",
  },
});
