/**
 * Marketing Service - API endpoints para o novo backend
 */
import api from './api';

// Campaigns
export const getCampaigns = () => api.get('/marketing/campaigns/');
export const getCampaign = (id: string) => api.get(`/marketing/campaigns/${id}/`);
export const createCampaign = (data: any) => api.post('/marketing/campaigns/', data);
export const updateCampaign = (id: string, data: any) => api.put(`/marketing/campaigns/${id}/`, data);

// Templates
export const getTemplates = () => api.get('/marketing/templates/');
export const getTemplate = (id: string) => api.get(`/marketing/templates/${id}/`);
export const createTemplate = (data: any) => api.post('/marketing/templates/', data);

// Automations
export const getAutomations = () => api.get('/marketing/automations/');
export const getAutomation = (id: string) => api.get(`/marketing/automations/${id}/`);
export const createAutomation = (data: any) => api.post('/marketing/automations/', data);

// Export
export const marketingService = {
  campaigns: {
    list: getCampaigns,
    get: getCampaign,
    create: createCampaign,
    update: updateCampaign,
  },
  templates: {
    list: getTemplates,
    get: getTemplate,
    create: createTemplate,
  },
  automations: {
    list: getAutomations,
    get: getAutomation,
    create: createAutomation,
  },
};

export default marketingService;
