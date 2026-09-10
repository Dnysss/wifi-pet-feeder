//tipo de programacao
export type Feed = {
  id: number;
  time: string;
  days: string;
  portions: number;
  enabled: boolean;
};

export type AlimentadorStatus = "pronto" | "alimentando" | "desconectado";
