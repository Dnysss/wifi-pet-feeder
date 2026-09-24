//tipo de programacao
export type Feed = {
  id: string;
  time: string;
  portions: number;
  enabled: boolean;
  days: string[];
};

export type AlimentadorStatus = "pronto" | "alimentando" | "desconectado";
