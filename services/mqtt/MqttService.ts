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

  private revisaoCarregada = false;

  private ackPendente: {
    requestId: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  } | null = null;

  private revision = 0;

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

  public readonly TOPIC_ACK_AGENDAMENTOS = "denys/alimentador/agendamentos/ack";
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
          this.TOPIC_ACK_AGENDAMENTOS,
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

      console.log("MQTT RECEBIDO:", topic, message.toString());

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

      if (topic === this.TOPIC_ACK_AGENDAMENTOS) {
        this.receberAckAgendamentos(conteudo);
      }
    });

    this.client.on("close", () => {
      this.ultimaPresenca = null;

      this.presencaListeners.forEach((listener) => {
        listener("desconhecido");
      });

      this.statusListeners.forEach((listener) => {
        listener("desconectado");
      });

      this.revisaoCarregada = false;

      if (this.ackPendente) {
        const pendente = this.ackPendente;
        this.ackPendente = null;
        clearTimeout(pendente.timeout);

        pendente.reject(
          new Error("Conexão MQTT perdida durante o salvamento."),
        );
      }
    });

    this.client.on("error", (error) => {
      console.error("Erro MQTT:", error.message);
    });
  }

  private receberAckAgendamentos(payload: string): void {
    try {
      const ack = JSON.parse(payload);

      if (!this.ackPendente) return;

      if (ack.requestId !== this.ackPendente.requestId) {
        console.warn("ACK ignorado: requestId diferente.");
        return;
      }

      const pendente = this.ackPendente;

      clearTimeout(pendente.timeout);
      this.ackPendente = null;

      if (ack.status === "saved" && ack.revision === this.revision + 1) {
        console.log("ESP32 confirmou o salvamento:", ack.requestId);
        pendente.resolve();
        this.solicitarAgendamentos();
      } else {
        pendente.reject(
          new Error(ack.message ?? "ESP32 rejeitou os agendamentos."),
        );
      }
    } catch (error) {
      console.error("Erro ao interpretar ACK:", error);
    }
  }

  private receberAgendamentos(payload: string): void {
    try {
      const dados = JSON.parse(payload);

      if (
        !dados ||
        Array.isArray(dados) ||
        !Array.isArray(dados.feeds) ||
        !Number.isSafeInteger(dados.revision) ||
        dados.revision < 0
      ) {
        console.error("Resposta de agendamentos inválida.");
        return;
      }

      if (this.ackPendente) {
        console.log("Resposta ignorada: aguardando confirmação do ESP32.");
        return;
      }

      if (this.revisaoCarregada && dados.revision < this.revision) {
        console.warn(
          "Resposta antiga ignorada.",
          "Recebida:",
          dados.revision,
          "Atual:",
          this.revision,
        );
        return;
      }

      if (
        dados.feeds.some(
          (item: any) => typeof item.id !== "string" || item.id.trim() === "",
        )
      ) {
        console.error("Existem agendamentos sem ID na resposta.");
        return;
      }

      const feeds: Feed[] = dados.feeds.map((item: any, index: number) => {
        let days: string[] = [];

        if (Array.isArray(item.days)) {
          days = item.days;
        } else if (typeof item.days === "string") {
          days = item.days
            .split(",")
            .map((dia: string) => dia.trim())
            .filter(Boolean);
        }

        return {
          id: item.id,
          time: item.time ?? "00:00",
          portions: Number(item.portions ?? 5),
          enabled: item.enabled ?? true,
          days,
        };
      });

      this.revision = dados.revision;
      this.revisaoCarregada = true;
      this.ultimoFeedRecebido = feeds;

      console.log("Revisão recebida:", this.revision);
      console.log("Agendamentos recuperados:", feeds);

      this.feedListeners.forEach((listener) => listener(feeds));
    } catch (error) {
      console.error("Erro ao interpretar agendamentos:", error);
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

  public sincronizarAgendamentos(feeds: Feed[]): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("SINCRONIZAR AGENDAMENTOS CHAMADO");
      if (!this.espEstaOnline()) {
        reject(new Error("ESP32 desconectado."));
        return;
      }

      if (!this.revisaoCarregada) {
        reject(new Error("Aguardando agendamentos do ESP32."));
        return;
      }

      if (this.ackPendente) {
        reject(new Error("Já existe uma sincronização em andamento."));
        return;
      }

      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const revision = this.revision + 1;

      const payload = {
        requestId,
        revision,
        feeds: feeds.map((item) => ({
          id: item.id,
          time: item.time,
          portions: Number(item.portions),
          enabled: item.enabled,
          days: Array.isArray(item.days) ? item.days.join(", ") : "",
        })),
      };

      const timeout = setTimeout(() => {
        if (this.ackPendente?.requestId !== requestId) return;

        this.ackPendente = null;

        reject(new Error("Tempo esgotado aguardando confirmação do ESP32."));
        this.solicitarAgendamentos();
      }, 10000);

      this.ackPendente = {
        requestId,
        resolve: () => {
          this.revision = revision;
          resolve();
        },
        reject,
        timeout,
      };

      this.client!.publish(
        this.TOPIC_AGENDAMENTOS,
        JSON.stringify(payload),
        { qos: 1, retain: false },
        (error) => {
          if (error && this.ackPendente?.requestId === requestId) {
            clearTimeout(timeout);
            this.ackPendente = null;
            reject(error);
          }
        },
      );
    });
  }

  public espEstaOnline(): boolean {
    return this.client?.connected === true && this.ultimaPresenca === "online";
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
