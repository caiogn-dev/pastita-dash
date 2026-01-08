export type PanelEvent = {
  event: string;
  data?: Record<string, unknown>;
  received_at: string;
};

let lastEvent: PanelEvent | null = null;

export const setLastEvent = (event: PanelEvent) => {
  lastEvent = event;
};

export const getLastEvent = () => lastEvent;
