export interface IMqttService {
  conectar(): void;
  desconectar(): void;
  enviarComando(segundos: number): void;
  estaConectado(): boolean;
  inscreverStatus(listener: (status: string) => void): () => void;
}
