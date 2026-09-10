import { MqttService } from "@/services/mqtt/MqttService";
import { AlimentadorStatus } from "@/types/feed";
import { useEffect, useState } from "react";

export function useMqtt() {
  const mqttService = MqttService.getInstance();
  const [status, setStatus] = useState<AlimentadorStatus>("desconectado");

  useEffect(() => {
    mqttService.conectar();

    const unsubscribe = mqttService.inscreverStatus((msg) => {
      if (msg === "alimentando") setStatus("alimentando");
      if (msg === "finalizado") setStatus("pronto");
      if (msg === "desconectado") setStatus("desconectado");
    });

    const interval = setInterval(() => {
      const conectado = mqttService.estaConectado();
      setStatus((prev) =>
        !conectado ? "desconectado" : prev === "desconectado" ? "pronto" : prev,
      );
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    status,
    isConnected: mqttService.estaConectado(),
    enviarComando: (seg: number) => mqttService.enviarComando(seg),
  };
}
