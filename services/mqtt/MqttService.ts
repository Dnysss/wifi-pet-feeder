import mqtt, { MqttClient } from "mqtt";
import { IMqttService } from "./IMqttService";
import { Feed } from "../../types/feed";

export class MqttService implements IMqttService {
  private static instance: MqttService;
  private client: MqttClient | null = null;
  private statusListeners: Set<(status: string) => void> = new Set();

  private readonly broker = process.env.EXPO_PUBLIC_MQTT_BROKER!;
  private readonly username = process.env.EXPO_PUBLIC_MQTT_USERNAME!;
  private readonly password = process.env.EXPO_PUBLIC_MQTT_PASSWORD!;

  public readonly TOPIC_COMANDO = "denys/alimentador/comando";
  public readonly TOPIC_STATUS = "denys/alimentador/status";
  public readonly TOPIC_AGENDAMENTOS = "denys/alimentador/agendamentos";

  private constructor() {}

  public static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }
    return MqttService.instance;
  }

  public conectar(): void {
    if (this.client) return;

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
      this.client?.subscribe(this.TOPIC_STATUS);
    });

    this.client.on("message", (topic, message) => {
      if (topic === this.TOPIC_STATUS) {
        const statusMsg = message.toString();
        this.statusListeners.forEach((listener) => listener(statusMsg));
      }
    });

    this.client.on("close", () => {
      this.statusListeners.forEach((listener) => listener("desconectado"));
    });
  }

  public enviarComando(segundos: number): void {
    if (this.client?.connected) {
      this.client.publish(this.TOPIC_COMANDO, segundos.toString());
    }
  }

  public sincronizarAgendamentos(feeds: Feed[]): void {
    if (this.client?.connected) {
      // Mapeia para o formato JSON esperado pelo C++ no ESP32
      const payloadFormatado = feeds.map((item) => ({
        time: item.time,
        portions: Number(item.portions),
        enabled: item.enabled,
        days: Array.isArray(item.days) ? item.days.join(", ") : item.days,
      }));

      const payloadJSON = JSON.stringify(payloadFormatado);

      this.client.publish(this.TOPIC_AGENDAMENTOS, payloadJSON, { qos: 1 });
      console.log("Agendamentos sincronizados com o ESP32:", payloadJSON);
    } else {
      console.warn("MQTT desconectado. Sincronização pendente.");
    }
  }

  public estaConectado(): boolean {
    return !!this.client?.connected;
  }

  public inscreverStatus(listener: (status: string) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public desconectar(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}