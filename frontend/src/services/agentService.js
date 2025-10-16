import api from './api';

export const agentService = {
  /**
   * Get all active agents
   * @param {string} type - Optional filter by type (clearing, entry, exit, both)
   */
  getAll: async (type = null) => {
    const params = type ? { type } : {};
    const response = await api.get('/agents', { params });
    return response.data;
  },

  /**
   * Get a specific agent by ID
   */
  getById: async (id) => {
    const response = await api.get(`/agents/${id}`);
    return response.data;
  },

  /**
   * Create a new agent (admin only)
   */
  create: async (data) => {
    const response = await api.post('/agents', data);
    return response.data;
  },

  /**
   * Update an existing agent (admin only)
   */
  update: async (id, data) => {
    const response = await api.put(`/agents/${id}`, data);
    return response.data;
  },

  /**
   * Delete an agent (admin only)
   */
  delete: async (id) => {
    const response = await api.delete(`/agents/${id}`);
    return response.data;
  },
};
