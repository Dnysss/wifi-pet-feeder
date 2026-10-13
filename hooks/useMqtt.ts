import { MqttService } from "@/services/mqtt/MqttService";
import { AlimentadorStatus } from "@/types/feed";
import { useEffect, useState } from "react";

type PresencaStatus = "online" | "offline" | "desconhecido";

export function useMqtt() {
  const mqttService = MqttService.getInstance();
  const [status, setStatus] = useState<AlimentadorStatus>("desconectado");
  const [presenca, setPresenca] = useState<PresencaStatus>("desconhecido");

  useEffect(() => {
    const unsubscribe = mqttService.inscreverStatus((msg) => {
      if (msg === "alimentando") {
        setStatus("alimentando");
      }

      if (msg === "finalizado" || msg === "parado") {
        setStatus("pronto");
      }

      if (msg === "desconectado") {
        setStatus("desconectado");
        setPresenca("desconhecido");
      }
    });

    const cancelarPresenca = mqttService.inscreverPresenca((novoStatus) => {
      if (!mqttService.estaConectado()) {
        setPresenca("desconhecido");
        setStatus("desconectado");
        return;
      }

      if (novoStatus === "online") {
        setPresenca("online");

        setStatus((prev) => (prev === "desconectado" ? "pronto" : prev));
      } else if (novoStatus === "offline") {
        setPresenca("offline");
        setStatus("desconectado");
      } else {
        setPresenca("desconhecido");
        setStatus("desconectado");
      }
    });

    mqttService.conectar();

    const interval = setInterval(() => {
      if (!mqttService.estaConectado()) {
        setPresenca("desconhecido");
        setStatus("desconectado");
      }
    }, 1000);

    return () => {
      unsubscribe();
      cancelarPresenca();
      clearInterval(interval);
    };
  }, []);

  return {
    status,
    presenca,
    isConnected: mqttService.estaConectado(),
    enviarComando: (seg: number) => mqttService.enviarComando(seg),
  };
}
