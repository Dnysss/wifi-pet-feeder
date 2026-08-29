import mqtt, { MqttClient } from "mqtt";

// CONFIGURAÇÕES DO HIVEMQ

const MQTT_BROKER =
  process.env.EXPO_PUBLIC_MQTT_BROKER!;

const MQTT_USERNAME =
  process.env.EXPO_PUBLIC_MQTT_USERNAME!;

const MQTT_PASSWORD =
  process.env.EXPO_PUBLIC_MQTT_PASSWORD!;

// TÓPICOS

export const MQTT_TOPIC_COMANDO =
  "denys/alimentador/comando";

export const MQTT_TOPIC_STATUS =
  "denys/alimentador/status";

// CLIENTE MQTT

let client: MqttClient | null = null;

// CALLBACK DE STATUS

let statusCallback:
  | ((status: string) => void)
  | null = null;

// CONECTAR AO HIVEMQ

export function conectarMQTT(): MqttClient {

  // Se já existe uma conexão,
  // reutiliza o cliente
  if (client) {
    return client;
  }

  console.log("Conectando ao HiveMQ...");

  client = mqtt.connect(MQTT_BROKER, {

    username: MQTT_USERNAME,

    password: MQTT_PASSWORD,

    protocol: "wss",

    reconnectPeriod: 5000,

    connectTimeout: 10000,

    clean: true,

    clientId:
      "Expo-Alimentador-" +
      Math.random()
        .toString(16)
        .substring(2, 10),
  });

  // CONECTADO

  client.on("connect", () => {

    console.log(
      "MQTT conectado ao HiveMQ!"
    );

    client?.subscribe(
      MQTT_TOPIC_STATUS,
      (error) => {

        if (error) {

          console.error(
            "Erro ao assinar tópico de status:",
            error
          );

        } else {

          console.log(
            "Inscrito em:",
            MQTT_TOPIC_STATUS
          );
        }
      }
    );
  });

  // RECEBER MENSAGENS

  client.on(
    "message",
    (topic, message) => {

      const mensagem =
        message.toString();

      console.log(
        "Mensagem MQTT recebida:",
        topic,
        mensagem
      );

      if (
        topic === MQTT_TOPIC_STATUS
      ) {

        if (statusCallback) {

          statusCallback(mensagem);
        }
      }
    }
  );

  // ERRO

  client.on("error", (error) => {

    console.error(
      "Erro MQTT:",
      error
    );
  });

  // DESCONECTADO

  client.on("close", () => {

    console.log(
      "MQTT desconectado."
    );
  });

  // RECONEXÃO

  client.on("reconnect", () => {

    console.log(
      "Tentando reconectar ao MQTT..."
    );
  });

  return client;
}

// PUBLICAR COMANDO

export function enviarComando(
  segundos: number
): void {

  if (!client) {

    console.error(
      "MQTT não está conectado."
    );

    return;
  }

  if (!client.connected) {

    console.error(
      "MQTT ainda não está conectado."
    );

    return;
  }

  const comando =
    segundos.toString();

  client.publish(
    MQTT_TOPIC_COMANDO,
    comando,
    (error) => {

      if (error) {

        console.error(
          "Erro ao enviar comando:",
          error
        );

      } else {

        console.log(
          "Comando enviado:",
          comando
        );
      }
    }
  );
}

// PARAR MOTOR

export function pararMotor(): void {

  enviarComando(0);
}

//RECEBER STATUS
export function definirCallbackStatus(
  callback:
    | ((status: string) => void)
    | null
): void {

  statusCallback = callback;
}


//VERIFICAR CONEXÃO
export function estaConectado(): boolean {

  return (
    client !== null &&
    client.connected
  );
}


//DESCONECTAR
export function desconectarMQTT(): void {

  if (client) {

    client.end();

    client = null;

    console.log(
      "MQTT desconectado manualmente."
    );
  }
}