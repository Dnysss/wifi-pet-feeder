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
  statusSincronizacao: StatusSincronizacao;
  addFeed: (novoFeed: Feed) => Promise<void>;
  toggleFeed: (id: string) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
};

export type StatusSincronizacao =
  | "aguardando"
  | "sincronizando"
  | "verificando"
  | "sincronizado"
  | "erro";

const FeedsContext = createContext<FeedsContextData | undefined>(undefined);

type FeedsProviderProps = {
  children: ReactNode;
};

export function FeedsProvider({ children }: FeedsProviderProps) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [statusSincronizacao, setStatusSincronizacao] =
    useState<StatusSincronizacao>("aguardando");

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
      setStatusSincronizacao("erro");
      throw new Error("ESP32 desconectado.");
    }

    if (salvandoRef.current) {
      throw new Error("Aguarde o salvamento anterior.");
    }

    salvandoRef.current = true;
    setSalvando(true);
    setStatusSincronizacao("sincronizando");

    try {
      //aguarda o ACK do ESP32
      await mqttService.sincronizarAgendamentos(novosFeeds);

      // Só atualiza a interface após receber ACK
      feedsRef.current = novosFeeds;
      setFeeds(novosFeeds);

      //esp confirmou o salvamento
      setStatusSincronizacao("sincronizado");

      console.log("Agendamentos confirmados pelo ESP32.");
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Erro desconhecido.";

      console.error("Problema na sincronização:", mensagem);

      if (mqttService.possuiSalvamentoIncerto()) {
        setStatusSincronizacao("verificando");

        Alert.alert(
          "Verificando salvamento",
          "O ESP32 pode ter recebido a alteração, mas a confirmação não chegou. O aplicativo irá consultar os dados armazenados.",
        );

        mqttService.tentarRecuperarSalvamento();
      } else {
        setStatusSincronizacao("erro");

        Alert.alert("Erro ao salvar", mensagem);

        mqttService.solicitarAgendamentos();
      }

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
      if (salvandoRef.current) return;

      feedsRef.current = feedsRecebidos;
      setFeeds(feedsRecebidos);

      //n confirma enquanto existir um salvamento incerto
      if (mqttService.possuiSalvamentoIncerto()) {
        setStatusSincronizacao("verificando");
        return;
      }

      setStatusSincronizacao("sincronizado");

      console.log("Lista atualizada com dados do ESP32:", feedsRecebidos);
    });

    const unsubscribeReconciliacao = mqttService.inscreverReconciliacao(
      (resultado) => {
        if (resultado === "confirmado") {
          setStatusSincronizacao("sincronizado");

          console.log("Sincronização recuperada e confirmada pela NVS.");
        } else {
          setStatusSincronizacao("erro");

          console.warn("Conflito detectado na recuperação dos agendamentos.");
        }
      },
    );

    mqttService.conectar();

    return () => {
      unsubscribe();
      unsubscribeReconciliacao();
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
        statusSincronizacao,
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
