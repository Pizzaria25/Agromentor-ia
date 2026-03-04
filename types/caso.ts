export type CasoStatus = "ABERTO" | "MONITORAMENTO" | "RESOLVIDO";

export type Caso = {
  id: string;
  user_id: string;
  title: string;
  culture: string | null;
  municipality: string | null;
  area_ha: number | null;
  status: CasoStatus;
  created_at: string;
  updated_at: string;
};
