import mqtt, { MqttClient } from "mqtt";
import { Feed } from "../../types/feed";
import { IMqttService } from "./IMqttService";

export class MqttService implements IMqttService {
  private static instance: MqttService;

  private client: MqttClient | null = null;

  private statusListeners = new Set<(status: string) => void>();

  private feedListeners = new Set<(feeds: Feed[]) => void>();

  private ultimoFeedRecebido: Feed[] | null = null;

  private ultimaPresenca: string | null = null;

  private readonly broker = process.env.EXPO_PUBLIC_MQTT_BROKER!;
  private readonly username = process.env.EXPO_PUBLIC_MQTT_USERNAME!;
  private readonly password = process.env.EXPO_PUBLIC_MQTT_PASSWORD!;

  public readonly TOPIC_COMANDO = "denys/alimentador/comando";
  public readonly TOPIC_STATUS = "denys/alimentador/status";
  public readonly TOPIC_AGENDAMENTOS = "denys/alimentador/agendamentos";

  public readonly TOPIC_SOLICITAR_AGENDAMENTOS =
    "denys/alimentador/agendamentos/solicitar";

  public readonly TOPIC_RESPOSTA_AGENDAMENTOS =
    "denys/alimentador/agendamentos/resposta";

  public readonly TOPIC_PRESENCA = "denys/alimentador/presenca";
  //conjunto de listeners especifico para presenca
  private presencaListeners = new Set<(status: string) => void>();

  private constructor() {}

  public static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }

    return MqttService.instance;
  }

  public conectar(): void {
    if (this.client) {
      if (this.client.connected) {
        this.solicitarAgendamentos();
      }
      return;
    }

    this.client = mqtt.connect(this.broker, {
      username: this.username,
      password: this.password,
      protocol: "wss",
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      clean: true,
      clientId:
        "Expo-Alimentador-" + Math.random().toString(16).substring(2, 10),
    });

    this.client.on("connect", () => {
      console.log("MQTT conectado!");

      this.client?.subscribe(
        [
          this.TOPIC_STATUS,
          this.TOPIC_RESPOSTA_AGENDAMENTOS,
          this.TOPIC_PRESENCA,
        ],
        (error) => {
          if (error) {
            console.error("Erro ao assinar tópicos MQTT:", error);
            return;
          }

          console.log("Inscrito no tópico de status e de resposta.");

          this.solicitarAgendamentos();
        },
      );
    });

    this.client.on("message", (topic, message) => {
      const conteudo = message.toString();

      if (topic === this.TOPIC_STATUS) {
        this.statusListeners.forEach((listener) => listener(conteudo));
      }

      if (topic === this.TOPIC_RESPOSTA_AGENDAMENTOS) {
        this.receberAgendamentos(conteudo);
      }

      if (topic === this.TOPIC_PRESENCA) {
        this.ultimaPresenca = conteudo;

        this.presencaListeners.forEach((listener) => listener(conteudo));
      }
    });

    this.client.on("close", () => {
      this.ultimaPresenca = null;
      this.statusListeners.forEach((listener) => listener("desconectado"));
    });

    this.client.on("error", (error) => {
      console.error("Erro MQTT:", error.message);
    });
  }

  private receberAgendamentos(payload: string): void {
    try {
      const dados = JSON.parse(payload);

      if (!Array.isArray(dados)) {
        console.error("A resposta MQTT não é uma lista.");
        return;
      }

      const feeds: Feed[] = dados.map((item: any, index: number) => {
        let days: string[] = [];

        if (Array.isArray(item.days)) {
          days = item.days;
        } else if (
          typeof item.days === "string" &&
          item.days.trim() !== "" &&
          !item.days.toLowerCase().includes("apenas uma vez")
        ) {
          days = item.days
            .split(",")
            .map((dia: string) => dia.trim())
            .filter(Boolean);
        }

        return {
          id: item.id ?? `esp32-${index}-${item.time ?? "00:00"}`,
          time: item.time ?? "00:00",
          portions: Number(item.portions ?? 5),
          enabled: item.enabled ?? true,
          days,
        };
      });

      this.ultimoFeedRecebido = feeds;

      console.log("Agendamentos recuperados do ESP32:", feeds);

      this.feedListeners.forEach((listener) => listener(feeds));
    } catch (error) {
      console.error("Erro ao interpretar agendamentos recebidos:", error);
    }
  }

  public solicitarAgendamentos(): void {
    if (!this.client?.connected) {
      console.warn(
        "MQTT desconectado. Não foi possível solicitar os agendamentos.",
      );
      return;
    }

    this.client.publish(this.TOPIC_SOLICITAR_AGENDAMENTOS, "solicitar");

    console.log("Solicitação de agendamentos enviada ao ESP32.");
  }

  public inscreverAgendamentos(listener: (feeds: Feed[]) => void): () => void {
    this.feedListeners.add(listener);

    if (this.ultimoFeedRecebido !== null) {
      listener(this.ultimoFeedRecebido);
    }

    return () => {
      this.feedListeners.delete(listener);
    };
  }

  public enviarComando(segundos: number): void {
    if (this.client?.connected) {
      this.client.publish(this.TOPIC_COMANDO, segundos.toString());
    } else {
      console.warn("MQTT desconectado. Comando não enviado.");
    }
  }

  public sincronizarAgendamentos(feeds: Feed[]): void {
    if (!this.client?.connected) {
      console.warn("MQTT desconectado. Sincronização não realizada.");
      return;
    }

    const payloadFormatado = feeds.map((item) => ({
      time: item.time,
      portions: Number(item.portions),
      enabled: item.enabled,
      days:
        Array.isArray(item.days) && item.days.length > 0
          ? item.days.join(", ")
          : "Apenas uma vez",
    }));

    const payloadJSON = JSON.stringify(payloadFormatado);

    this.client.publish(this.TOPIC_AGENDAMENTOS, payloadJSON, { qos: 1 });

    console.log("Agendamentos enviados ao ESP32:", payloadJSON);
  }

  public estaConectado(): boolean {
    return !!this.client?.connected;
  }

  public inscreverStatus(listener: (status: string) => void): () => void {
    this.statusListeners.add(listener);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public desconectar(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  public inscreverPresenca(listener: (status: string) => void): () => void {
    this.presencaListeners.add(listener);

    if (this.ultimaPresenca !== null) {
      listener(this.ultimaPresenca);
    }

    return () => {
      this.presencaListeners.delete(listener);
    };
  }
}
