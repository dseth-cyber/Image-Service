import api from '@/lib/axios';

const BASE = '/image-service/api/v1';

export function createImageServiceApi(api: any) {
  return {
    // Overview / Dashboard
    getOverview: () => api.get(`${BASE}/overview`).then((r: any) => r.data),

    // Images
    getImages: (params: {
      page?: number; limit?: number; cameraId?: string; status?: string;
      from?: string; to?: string; q?: string; tagKey?: string; tagValue?: string;
      sort?: string; order?: string;
    }) => api.get(`${BASE}/images`, { params }).then((r: any) => r.data),

    getImage: (id: string) => api.get(`${BASE}/images/${id}`).then((r: any) => r.data),

    updateImageMetadata: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/images/${id}/metadata`, data).then((r: any) => r.data),

    deleteImage: (id: string) => api.delete(`${BASE}/images/${id}`).then((r: any) => r.data),

    // Cameras
    getCameras: (params?: { status?: string; enabled?: boolean }) =>
      api.get(`${BASE}/cameras`, { params }).then((r: any) => r.data),

    getCamera: (id: string) => api.get(`${BASE}/cameras/${id}`).then((r: any) => r.data),

    createCamera: (data: Record<string, unknown>) =>
      api.post(`${BASE}/cameras`, data).then((r: any) => r.data),

    updateCamera: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/cameras/${id}`, data).then((r: any) => r.data),

    deactivateCamera: (id: string) => api.delete(`${BASE}/cameras/${id}`),

    // Retention Policies
    getRetentionPolicies: () =>
      api.get(`${BASE}/retention-policies`).then((r: any) => r.data),

    getRetentionPolicy: (id: string) =>
      api.get(`${BASE}/retention-policies/${id}`).then((r: any) => r.data),

    createRetentionPolicy: (data: Record<string, unknown>) =>
      api.post(`${BASE}/retention-policies`, data).then((r: any) => r.data),

    updateRetentionPolicy: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/retention-policies/${id}`, data).then((r: any) => r.data),

    deleteRetentionPolicy: (id: string) =>
      api.delete(`${BASE}/retention-policies/${id}`),

    // Storage
    getStorageSummary: () =>
      api.get(`${BASE}/storage/summary`).then((r: any) => r.data),

    getCameraStorage: (cameraId: string) =>
      api.get(`${BASE}/storage/cameras/${cameraId}`).then((r: any) => r.data),

    getStorageGrowth: (days?: number) =>
      api.get(`${BASE}/storage/growth`, { params: { days } }).then((r: any) => r.data),

    // Processing Logs
    getProcessingLogs: (params: {
      page?: number; limit?: number; status?: string; jobType?: string;
      cameraId?: string; from?: string; to?: string; q?: string;
    }) => api.get(`${BASE}/processing-logs`, { params }).then((r: any) => r.data),

    retryJob: (jobId: string) =>
      api.post(`${BASE}/processing-logs/${jobId}/retry`).then((r: any) => r.data),

    // Alerts
    getAlerts: (params?: { severity?: string; resolved?: boolean }) =>
      api.get(`${BASE}/alerts`, { params }).then((r: any) => r.data),
  };
}

export const imageServiceApi = createImageServiceApi(api);
