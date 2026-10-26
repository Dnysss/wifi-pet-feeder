import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { MqttService } from "@/services/mqtt/MqttService";
import { Feed } from "@/types/feed";
import { Alert } from "react-native";

type FeedsContextData = {
  feeds: Feed[];
  salvando: boolean;
  addFeed: (novoFeed: Feed) => Promise<void>;
  toggleFeed: (id: string) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
};

const FeedsContext = createContext<FeedsContextData | undefined>(undefined);

type FeedsProviderProps = {
  children: ReactNode;
};

export function FeedsProvider({ children }: FeedsProviderProps) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [salvando, setSalvando] = useState(false);

  const salvandoRef = useRef(false);
  const feedsRef = useRef<Feed[]>([]);

  const mqttService = MqttService.getInstance();

  const verificarConexao = () => {
    if (!mqttService.espEstaOnline()) {
      Alert.alert(
        "ESP32 desconectado",
        "Conecte o alimentador antes de alterar os agendamentos.",
      );
      return false;
    }

    return true;
  };

  const atualizarESincronizar = async (novosFeeds: Feed[]): Promise<void> => {
    if (!verificarConexao()) {
      throw new Error("ESP32 desconectado.");
    }

    if (salvandoRef.current) {
      throw new Error("Aguarde o salvamento anterior.");
    }

    salvandoRef.current = true;
    setSalvando(true);

    try {
      await mqttService.sincronizarAgendamentos(novosFeeds);

      // Só atualiza a interface após receber ACK
      feedsRef.current = novosFeeds;
      setFeeds(novosFeeds);

      console.log("Agendamentos confirmados pelo ESP32.");
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Erro desconhecido.";

      console.error("Erro ao salvar agendamentos:", mensagem);

      Alert.alert("Erro ao salvar", mensagem);

      // Recupera o estado verdadeiro da NVS
      mqttService.solicitarAgendamentos();

      throw error;
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  const addFeed = async (novoFeed: Feed) => {
    console.log("ADD FEED CHAMADO:", novoFeed);
    
    const atualizados = [...feedsRef.current, novoFeed];
    await atualizarESincronizar(atualizados);
  };

  const toggleFeed = async (id: string) => {
    const atualizados = feedsRef.current.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item,
    );

    await atualizarESincronizar(atualizados);
  };

  const removeFeed = async (id: string) => {
    const atualizados = feedsRef.current.filter((item) => item.id !== id);

    await atualizarESincronizar(atualizados);
  };

  useEffect(() => {
    const unsubscribe = mqttService.inscreverAgendamentos((feedsRecebidos) => {
      // Não sobrescrever a interface durante uma gravação
      if (salvandoRef.current) return;

      feedsRef.current = feedsRecebidos;
      setFeeds(feedsRecebidos);

      console.log("Lista atualizada com dados do ESP32:", feedsRecebidos);
    });

    mqttService.conectar();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <FeedsContext.Provider
      value={{
        feeds,
        salvando,
        addFeed,
        toggleFeed,
        removeFeed,
      }}
    >
      {children}
    </FeedsContext.Provider>
  );
}

export function useFeedsContext() {
  const context = useContext(FeedsContext);

  if (!context) {
    throw new Error(
      "useFeedsContext deve ser usado dentro de um FeedsProvider",
    );
  }

  return context;
}
