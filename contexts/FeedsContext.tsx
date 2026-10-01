import { createContext, useContext, useState, ReactNode } from "react";

import { MqttService } from "@/services/mqtt/MqttService";
import { Feed } from "@/types/feed";

type FeedsContextData = {
  feeds: Feed[];
  addFeed: (novoFeed: Feed) => void;
  toggleFeed: (id: string) => void;
  removeFeed: (id: string) => void;
};

const FeedsContext = createContext<FeedsContextData | undefined>(undefined);

type FeedsProviderProps = {
  children: ReactNode;
};

export function FeedsProvider({ children }: FeedsProviderProps) {
  const [feeds, setFeeds] = useState<Feed[]>([]);

  const mqttService = MqttService.getInstance();

  const atualizarESincronizar = (novosFeeds: Feed[]) => {
    setFeeds(novosFeeds);

    mqttService.sincronizarAgendamentos(novosFeeds);
  };

  const addFeed = (novoFeed: Feed) => {
    const atualizados = [...feeds, novoFeed];

    console.log("FEEDS ANTES:", feeds);
    console.log("FEEDS DEPOIS:", atualizados);

    atualizarESincronizar(atualizados);
  };

  const toggleFeed = (id: string) => {
    const atualizados = feeds.map((item) =>
      item.id === id
        ? { ...item, enabled: !item.enabled }
        : item,
    );

    atualizarESincronizar(atualizados);
  };

  const removeFeed = (id: string) => {
    const atualizados = feeds.filter((item) => item.id !== id);

    atualizarESincronizar(atualizados);
  };

  return (
    <FeedsContext.Provider
      value={{
        feeds,
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