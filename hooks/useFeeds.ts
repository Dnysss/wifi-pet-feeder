import { MqttService } from "@/services/mqtt/MqttService";
import { Feed } from "@/types/feed";
import { useState } from "react";

export const useFeeds = () => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const mqttService = MqttService.getInstance();

  // funcao para atualizar o estado local e sincronizar com o esp
  const atualizarESincronizar = (novosFeeds: Feed[]) => {
    setFeeds(novosFeeds);

    //transmitir lista via mqtt para a memoria flash do eps
    mqttService.sincronizarAgendamentos(novosFeeds);
  };

  const addFeed = (novoFeed: Feed) => {
    const atualizados = [...feeds, novoFeed];
    atualizarESincronizar(atualizados);
  };

  const toggleFeed = (id: string) => {
    const atualizados = feeds.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item,
    );
    atualizarESincronizar(atualizados);
  };

  const removeFeed = (id: string) => {
    const atualizados = feeds.filter((item) => item.id !== id);
    atualizarESincronizar(atualizados);
  };

  return {
    feeds,
    addFeed,
    toggleFeed,
    removeFeed,
  };
};
