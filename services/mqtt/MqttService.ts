import mqtt, { MqttClient } from "mqtt";
import { IMqttService } from "./IMqttService";

export class MqttService implements IMqttService {
  private static instance: MqttService;
  private client: MqttClient | null = null;
  private statusListeners: Set<(status: string) => void> = new Set();

  private readonly broker = process.env.EXPO_PUBLIC_MQTT_BROKER!;
  private readonly username = process.env.EXPO_PUBLIC_MQTT_USERNAME!;
  private readonly password = process.env.EXPO_PUBLIC_MQTT_PASSWORD!;

  public readonly TOPIC_COMANDO = "denys/alimentador/comando";
  public readonly TOPIC_STATUS = "denys/alimentador/status";

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
