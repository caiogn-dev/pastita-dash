import api from './api';

export interface BioLink {
  id: string;
  store: string;
  title: string;
  url: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface BioStats {
  days: number;
  page_views: { total: number; series: { date: string; views: number }[] };
  links: { key: string; title: string; total: number }[];
}

const BASE = '/stores/bio-links';

export const listBioLinks = async (storeRef: string): Promise<BioLink[]> => {
  const { data } = await api.get(`${BASE}/`, { params: { store: storeRef } });
  return Array.isArray(data) ? data : data.results ?? [];
};

export const createBioLink = async (
  payload: Partial<BioLink> & { store: string }
): Promise<BioLink> => {
  const { data } = await api.post(`${BASE}/`, payload);
  return data;
};

export const updateBioLink = async (id: string, payload: Partial<BioLink>): Promise<BioLink> => {
  const { data } = await api.patch(`${BASE}/${id}/`, payload);
  return data;
};

export const deleteBioLink = async (id: string): Promise<void> => {
  await api.delete(`${BASE}/${id}/`);
};

export const reorderBioLinks = async (storeRef: string, order: string[]): Promise<void> => {
  await api.post(`${BASE}/reorder/`, { store: storeRef, order });
};

export const getBioStats = async (storeId: string, days = 30): Promise<BioStats> => {
  const { data } = await api.get(`/stores/stores/${storeId}/bio-stats/`, {
    params: { days },
    skipAutoLogout: true,
  });
  return data;
};
