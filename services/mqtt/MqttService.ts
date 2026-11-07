import mqtt, { MqttClient } from "mqtt";
import { Feed } from "../../types/feed";
import { IMqttService } from "./IMqttService";

export class SalvamentoPendenteError extends Error {
  constructor() {
    super("Salvamento sem ACK. Aguardando verificação da NVS.");
    this.name = "SalvamentoPendenteError";
  }
}

export class MqttService implements IMqttService {
  private static instance: MqttService;

  private client: MqttClient | null = null;

  private statusListeners = new Set<(status: string) => void>();

  private feedListeners = new Set<(feeds: Feed[]) => void>();

  private reconciliacaoListeners = new Set<
    (resultado: "confirmado" | "conflito") => void
  >();

  private ultimoFeedRecebido: Feed[] | null = null;

  private ultimaPresenca: string | null = null;

  private revisaoCarregada = false;

  private ackPendente: {
    requestId: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
    revision: number;
    feeds: Feed[];
  } | null = null;

  private salvamentoIncerto: {
    requestId: string;
    revision: number;
    feeds: Feed[];
    criadoEm: number;
  } | null = null;

  public podeSalvarAgendamentos(): boolean {
    return (
      this.client?.connected === true &&
      this.espEstaOnline() &&
      this.revisaoCarregada &&
      !this.salvamentoIncerto &&
      !this.ackPendente
    );
  }

  private revision = 0;
  private consultaPendenteId: string | null = null;
  private consultaPendenteEm = 0;

  private readonly broker = process.env.EXPO_PUBLIC_MQTT_BROKER!;
  private readonly username = process.env.EXPO_PUBLIC_MQTT_USERNAME!;
  private readonly password = process.env.EXPO_PUBLIC_MQTT_PASSWORD!;

  public readonly TOPIC_COMANDO = "denys/alimentador/comando";
  public readonly TOPIC_STATUS = "denys/alimentador/status";
  public readonly TOPIC_AGENDAMENTOS = "denys/alimentador/agendamentos";

  private readonly TIMEOUT_CONSULTA = 10000;

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

  public possuiSalvamentoIncerto(): boolean {
    return this.salvamentoIncerto !== null;
  }

  public inscreverReconciliacao(
    listener: (resultado: "confirmado" | "conflito") => void,
  ): () => void {
    this.reconciliacaoListeners.add(listener);

    return () => {
      this.reconciliacaoListeners.delete(listener);
    };
  }

  public tentarRecuperarSalvamento(): boolean {
    if (!this.client?.connected) {
      console.warn("MQTT desconectado. Recuperação indisponível.");
      return false;
    }

    if (!this.espEstaOnline()) {
      console.warn("ESP32 offline. Aguardando reconexão.");
      return false;
    }

    console.log("Consultando agendamentos da NVS...");

    this.solicitarAgendamentos();
    return true;
  }

  public conectar(): void {
    if (this.client) {
      console.log("MQTT: cliente já existe. Reutilizando conexão.");
      return;
    }

    console.count("CLIENTE MQTT CRIADO");

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
      console.count("EVENTO MQTT CONNECT");

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
        const presencaAnterior = this.ultimaPresenca;

        this.ultimaPresenca = conteudo;

        this.presencaListeners.forEach((listener) => listener(conteudo));

        if (conteudo === "online" && presencaAnterior !== "online") {
          console.log("ESP32 voltou a ficar online.");

          if (this.salvamentoIncerto) {
            this.consultarSalvamentoPendente();
          } else if (!this.revisaoCarregada) {
            this.solicitarAgendamentos();
          }
        }
      }

      if (topic === this.TOPIC_ACK_AGENDAMENTOS) {
        this.receberAckAgendamentos(conteudo);
      }
    });

    this.client.on("close", () => {
      console.count("EVENTO MQTT CLOSE");
      this.ultimaPresenca = null;

      this.presencaListeners.forEach((listener) => {
        listener("desconhecido");
      });

      this.statusListeners.forEach((listener) => {
        listener("desconectado");
      });

      this.revisaoCarregada = false;
      this.consultaPendenteId = null;
      this.consultaPendenteEm = 0;

      if (this.ackPendente) {
        const pendente = this.ackPendente;

        this.salvamentoIncerto = {
          requestId: pendente.requestId,
          revision: pendente.revision,
          feeds: pendente.feeds,
          criadoEm: Date.now(),
        };
        this.ackPendente = null;
        clearTimeout(pendente.timeout);

        pendente.reject(
          new Error(
            "Conexão MQTT perdida durante o salvamento. Aguardando reconexão para verificar a NVS.",
          ),
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

      if (
        !ack ||
        typeof ack !== "object" ||
        Array.isArray(ack) ||
        typeof ack.requestId !== "string" ||
        ack.requestId.trim() === "" ||
        !["saved", "rejected"].includes(ack.status) ||
        !Number.isSafeInteger(ack.revision) ||
        ack.revision < 0
      ) {
        console.error("ACK inválido recebido.");
        return;
      }

      if (!this.ackPendente) return;

      const pendente = this.ackPendente;

      if (ack.requestId !== pendente.requestId) {
        console.warn("ACK ignorado: requestId diferente.");
        return;
      }

      if (ack.revision !== pendente.revision) {
        console.warn("ACK ignorado: revisão diferente.");
        return;
      }

      clearTimeout(pendente.timeout);
      this.ackPendente = null;

      if (ack.status === "saved") {
        console.log("ESP32 confirmou o salvamento:", ack.requestId);

        if (this.salvamentoIncerto?.requestId === ack.requestId) {
          this.salvamentoIncerto = null;
        }

        pendente.resolve();

        this.solicitarAgendamentos();
      } else {
        console.error(
          "ESP32 rejeitou os agendamentos:",
          ack.message ?? "Motivo não informado.",
        );

        pendente.reject(
          new Error(ack.message ?? "ESP32 rejeitou os agendamentos."),
        );

        //consulta a nvs para recuperar o estado do esp
        this.solicitarAgendamentos();
      }
    } catch (error) {
      console.error("Erro ao interpretar ACK:", error);
    }
  }

  private receberAgendamentos(payload: string): void {
    try {
      const dados = JSON.parse(payload);

      if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        console.error("Resposta de agendamentos inválida.");
        return;
      }

      if (
        typeof dados.queryId !== "string" ||
        dados.queryId !== this.consultaPendenteId
      ) {
        console.warn("Resposta de consulta antiga ou desconhecida ignorada.");
        return;
      }

      if (
        !Array.isArray(dados.feeds) ||
        !Number.isSafeInteger(dados.revision) ||
        dados.revision < 0 ||
        typeof dados.requestId !== "string" ||
        (dados.revision > 0 && dados.requestId.trim() === "")
      ) {
        console.error("Resposta de agendamentos inválida.");
        return;
      }

      //n atualiza a lista enquanto aguarda um ACK
      if (this.ackPendente) {
        this.consultaPendenteId = null;
        this.consultaPendenteEm = 0;

        console.log("Resposta ignorada: aguardando confirmação do ESP32.");
        return;
      }

      if (this.revisaoCarregada && dados.revision < this.revision) {
        this.consultaPendenteId = null;
        this.consultaPendenteEm = 0;

        console.warn(
          "Resposta antiga ignorada.",
          "Recebida:",
          dados.revision,
          "Atual:",
          this.revision,
        );
        return;
      }

      const diasValidos = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      const idsRecebidos = new Set<string>();

      for (const item of dados.feeds) {
        if (
          !item ||
          typeof item.id !== "string" ||
          item.id.trim() === "" ||
          typeof item.time !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ||
          !Number.isInteger(item.portions) ||
          item.portions < 1 ||
          item.portions > 60 ||
          typeof item.enabled !== "boolean" ||
          !Array.isArray(item.days) ||
          item.days.length < 1 ||
          item.days.length > 7 ||
          !item.days.every(
            (dia: unknown) =>
              typeof dia === "string" && diasValidos.includes(dia),
          ) ||
          new Set(item.days).size !== item.days.length
        ) {
          console.error("Agendamento inválido recebido:", item);
          return;
        }

        if (idsRecebidos.has(item.id)) {
          console.error("ID duplicado recebido:", item.id);
          return;
        }

        idsRecebidos.add(item.id);
      }

      const feeds: Feed[] = dados.feeds.map((item: any) => ({
        id: item.id,
        time: item.time,
        portions: item.portions,
        enabled: item.enabled,
        days: item.days,
      }));

      this.consultaPendenteId = null;
      this.consultaPendenteEm = 0;

      const reconciliado = this.reconciliarSalvamento(
        dados.revision,
        dados.requestId,
        feeds,
      );

      if (!reconciliado) {
        console.warn("Lista não atualizada devido à reconciliação pendente.");
        return;
      }

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

  public consultarSalvamentoPendente(): void {
    if (!this.salvamentoIncerto) {
      console.log("Nenhum salvamento pendente.");
      return;
    }

    if (!this.client?.connected || !this.espEstaOnline()) {
      console.warn("ESP32 ou MQTT offline. Recuperação aguardando reconexão.");
      return;
    }

    console.log("Consultando NVS para recuperar salvamento pendente...");

    this.solicitarAgendamentos();
  }

  public solicitarAgendamentos(): void {
    if (!this.client?.connected) {
      console.warn("MQTT desconectado.");
      return;
    }

    if (!this.espEstaOnline()) {
      console.warn("ESP32 offline. Consulta não realizada.");
      return;
    }

    if (!this.client?.connected) {
      console.warn("MQTT desconectado.");
      return;
    }

    if (this.consultaPendenteId) {
      const tempoDecorrido = Date.now() - this.consultaPendenteEm;

      if (tempoDecorrido < this.TIMEOUT_CONSULTA) {
        console.log("Já existe uma consulta em andamento.");
        return;
      }

      console.warn("Consulta anterior expirou. Iniciando nova consulta.");

      this.consultaPendenteId = null;
      this.consultaPendenteEm = 0;
    }

    const queryId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    this.consultaPendenteId = queryId;
    this.consultaPendenteEm = Date.now();

    this.client.publish(
      this.TOPIC_SOLICITAR_AGENDAMENTOS,
      JSON.stringify({ queryId }),
      { qos: 1, retain: false },
      (error) => {
        if (error) {
          console.error("Erro ao solicitar agendamentos:", error);

          if (this.consultaPendenteId === queryId) {
            this.consultaPendenteId = null;
            this.consultaPendenteEm = 0;
          }
        }
      },
    );
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

      if (this.salvamentoIncerto) {
        reject(
          new Error(
            "Existe um salvamento aguardando verificação. Aguarde a recuperação dos agendamentos.",
          ),
        );
        return;
      }

      if (!Array.isArray(feeds) || feeds.length > 15) {
        reject(new Error("Quantidade de agendamentos inválida."));
        return;
      }

      const ids = new Set<string>();

      const diasValidos = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

      for (const feed of feeds) {
        if (
          !feed.id ||
          typeof feed.id !== "string" ||
          feed.id.trim() === "" ||
          feed.id.length >= 80 ||
          ids.has(feed.id) ||
          typeof feed.time !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(feed.time) ||
          !Number.isInteger(Number(feed.portions)) ||
          Number(feed.portions) < 1 ||
          Number(feed.portions) > 60 ||
          typeof feed.enabled !== "boolean" ||
          !Array.isArray(feed.days) ||
          feed.days.length < 1 ||
          feed.days.length > 7 ||
          !feed.days.every(
            (dia) => typeof dia === "string" && diasValidos.includes(dia),
          ) ||
          new Set(feed.days).size !== feed.days.length
        ) {
          reject(new Error("Existe um agendamento com dados inválidos."));
          return;
        }

        ids.add(feed.id);
      }

      if (this.revision >= 4294967295) {
        reject(new Error("Limite máximo de revisões atingido."));
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
          days: [...item.days],
        })),
      };

      const feedsEnviados = payload.feeds;
      const timeout = setTimeout(() => {
        if (this.ackPendente?.requestId !== requestId) return;

        this.ackPendente = null;

        this.salvamentoIncerto = {
          requestId,
          revision,
          feeds: feedsEnviados,
          criadoEm: Date.now(),
        };

        console.warn(
          "ACK não recebido. Aguardando verificação da NVS:",
          requestId,
        );

        reject(new SalvamentoPendenteError());

        this.solicitarAgendamentos();
      }, 10000);

      this.ackPendente = {
        requestId,
        revision,
        feeds: feedsEnviados,
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

            this.salvamentoIncerto = {
              requestId,
              revision,
              feeds: feedsEnviados,
              criadoEm: Date.now(),
            };

            console.error(
              "Falha na publicação MQTT. Salvamento será verificado na NVS.",
              error,
            );

            reject(new SalvamentoPendenteError());

            this.consultarSalvamentoPendente();
          }
        },
      );
    });
  }

  private compararFeeds(a: Feed[], b: Feed[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((feed) => {
      const outro = b.find((item) => item.id === feed.id);

      if (!outro) {
        return false;
      }

      const diasA = [...feed.days].sort();
      const diasB = [...outro.days].sort();

      return (
        feed.time === outro.time &&
        Number(feed.portions) === Number(outro.portions) &&
        feed.enabled === outro.enabled &&
        JSON.stringify(diasA) === JSON.stringify(diasB)
      );
    });
  }

  private reconciliarSalvamento(
    revisionRecebida: number,
    requestIdRecebido: string,
    feedsRecebidos: Feed[],
  ): boolean {
    const pendente = this.salvamentoIncerto;

    if (!pendente) return true;

    if (revisionRecebida < pendente.revision) {
      console.warn("Revisão anterior à operação pendente.");
      return false;
    }

    const confirmado =
      revisionRecebida === pendente.revision &&
      requestIdRecebido === pendente.requestId &&
      this.compararFeeds(feedsRecebidos, pendente.feeds);

    if (confirmado) {
      this.salvamentoIncerto = null;

      console.log("Salvamento confirmado pela NVS:", requestIdRecebido);

      this.reconciliacaoListeners.forEach((listener) => {
        listener("confirmado");
      });

      return true;
    }

    console.warn(
      "A NVS não corresponde à operação pendente. Mantendo salvamento incerto.",
    );

    this.reconciliacaoListeners.forEach((listener) => {
      listener("conflito");
    });

    return false;
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
