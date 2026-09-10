import { Feed } from "@/types/feed";
import { useEffect, useRef } from "react";

export function useFeedScheduler(
  feeds: Feed[],
  isConnected: boolean,
  onTriggerFeed: (portions: number) => void,
  onToggleOneTimeFeed: (id: number) => void,
) {
  const executedFeeds = useRef<{ [key: string]: boolean }>({});
  const feedsRef = useRef(feeds);

  useEffect(() => {
    feedsRef.current = feeds;
  }, [feeds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();

      // Limpeza da memória à meia-noite
      if (
        agora.getHours() === 0 &&
        agora.getMinutes() === 0 &&
        agora.getSeconds() === 0
      ) {
        executedFeeds.current = {};
      }

      const horarioAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
      const dayIds = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const diaAtual = dayIds[agora.getDay()];
      const todayKey = `${agora.getFullYear()}-${agora.getMonth()}-${agora.getDate()}`;

      const dayLabels: Record<string, string> = {
        mon: "Seg.",
        tue: "Ter.",
        wed: "Qua.",
        thu: "Qui.",
        fri: "Sex.",
        sat: "Sáb.",
        sun: "Dom.",
      };

      feedsRef.current.forEach((feed) => {
        if (!feed.enabled || feed.time !== horarioAtual) return;

        const isApenasUmaVez = feed.days === "Apenas uma vez";
        const diasDaProgramacao = feed.days.split(",").map((d) => d.trim());
        const diaSelecionado = diasDaProgramacao.includes(dayLabels[diaAtual]);

        if (!isApenasUmaVez && !diaSelecionado) return;

        const executionKey = `${feed.id}-${todayKey}-${horarioAtual}`;
        if (executedFeeds.current[executionKey] || !isConnected) return;

        onTriggerFeed(feed.portions);
        executedFeeds.current[executionKey] = true;

        if (isApenasUmaVez) {
          onToggleOneTimeFeed(feed.id);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, onTriggerFeed, onToggleOneTimeFeed]);
}
