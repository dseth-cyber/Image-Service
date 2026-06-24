import api from '@/lib/axios';

const BASE = '/image-service/api/v1';

export function createImageServiceApi(api: any) {
  return {
    // Overview / Dashboard
    getOverview: () => api.get(`${BASE}/processing-logs/stats`).then((r: any) => r.data),

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

    getStorageForecast: () =>
      api.get(`${BASE}/storage/forecast`).then((r: any) => r.data),

    // SMB
    testSmbConnection: (data: {
      smbSharePath: string; smbUsername: string; smbPasswordEncrypted: string; smbDomain?: string;
    }) => api.post(`${BASE}/smb/test-connection`, data).then((r: any) => r.data),

    listSmbShares: (data: {
      host: string; smbUsername: string; smbPasswordEncrypted: string; smbDomain?: string;
    }) => api.post(`${BASE}/smb/list-shares`, data).then((r: any) => r.data),

    browseSmb: (data: {
      smbSharePath: string; smbUsername: string; smbPasswordEncrypted: string;
      smbDomain?: string; path?: string;
    }) => api.post(`${BASE}/smb/browse`, data).then((r: any) => r.data),

    // Processing Logs
    getProcessingLogs: (params: {
      page?: number; limit?: number; status?: string; jobType?: string;
      cameraId?: string; from?: string; to?: string; q?: string;
    }) => api.get(`${BASE}/processing-logs`, { params }).then((r: any) => r.data),

    retryJob: (jobId: string) =>
      api.post(`${BASE}/processing-logs/${jobId}/retry`).then((r: any) => r.data),

    rejectJob: (jobId: string) =>
      api.post(`${BASE}/processing-logs/${jobId}/reject`).then((r: any) => r.data),

    getDlqSummary: () =>
      api.get(`${BASE}/processing-logs/dlq/summary`).then((r: any) => r.data),

    bulkRetryDlq: (jobType?: string) =>
      api.post(`${BASE}/processing-logs/dlq/bulk-retry`, null, { params: { jobType } }).then((r: any) => r.data),

    bulkRejectDlq: (jobType?: string) =>
      api.post(`${BASE}/processing-logs/dlq/bulk-reject`, null, { params: { jobType } }).then((r: any) => r.data),

    // Image Tags
    upsertImageTags: (id: string, tags: Record<string, string>) =>
      api.post(`${BASE}/images/${id}/tags`, tags).then((r: any) => r.data),

    deleteImageTag: (id: string, key: string) =>
      api.delete(`${BASE}/images/${id}/tags/${key}`).then((r: any) => r.data),

    // Alerts
    getAlerts: (params?: { severity?: string; resolved?: boolean; page?: number; limit?: number }) =>
      api.get(`${BASE}/alerts`, { params }).then((r: any) => r.data),

    getAlert: (id: string) =>
      api.get(`${BASE}/alerts/${id}`).then((r: any) => r.data),

    acknowledgeAlert: (id: string) =>
      api.patch(`${BASE}/alerts/${id}/acknowledge`).then((r: any) => r.data),

    resolveAlert: (id: string) =>
      api.patch(`${BASE}/alerts/${id}/resolve`).then((r: any) => r.data),

    // Users
    getUsers: (params?: { page?: number; limit?: number; enabled?: boolean }) =>
      api.get(`${BASE}/users`, { params }).then((r: any) => r.data),

    getUser: (id: string) =>
      api.get(`${BASE}/users/${id}`).then((r: any) => r.data),

    createUser: (data: { username: string; email: string; password: string; role: string; customPermissions?: string[] }) =>
      api.post(`${BASE}/users`, data).then((r: any) => r.data),

    updateUser: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/users/${id}`, data).then((r: any) => r.data),

    deactivateUser: (id: string) =>
      api.delete(`${BASE}/users/${id}`).then((r: any) => r.data),

    // Roles
    getRoles: () =>
      api.get(`${BASE}/roles`).then((r: any) => r.data),

    getRole: (id: string) =>
      api.get(`${BASE}/roles/${id}`).then((r: any) => r.data),

    createRole: (data: Record<string, unknown>) =>
      api.post(`${BASE}/roles`, data).then((r: any) => r.data),

    updateRole: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/roles/${id}`, data).then((r: any) => r.data),

    deleteRole: (id: string) =>
      api.delete(`${BASE}/roles/${id}`).then((r: any) => r.data),

    // Alert Rules
    getAlertRules: (params?: { page?: number; limit?: number }) =>
      api.get(`${BASE}/alert-rules`, { params }).then((r: any) => r.data),

    getAlertRule: (id: string) =>
      api.get(`${BASE}/alert-rules/${id}`).then((r: any) => r.data),

    createAlertRule: (data: {
      name: string; alertType: string; description?: string;
      enabled?: boolean; cooldownMinutes?: number; notificationChannels?: string[];
    }) => api.post(`${BASE}/alert-rules`, data).then((r: any) => r.data),

    updateAlertRule: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/alert-rules/${id}`, data).then((r: any) => r.data),

    deleteAlertRule: (id: string) =>
      api.delete(`${BASE}/alert-rules/${id}`),

    // Telegram Settings
    getTelegramSettings: () =>
      api.get(`${BASE}/settings/telegram`).then((r: any) => r.data),

    updateTelegramSettings: (data: Record<string, string>) =>
      api.patch(`${BASE}/settings/telegram`, data).then((r: any) => r.data),

    // API Keys
    getApiKeys: (params?: { page?: number; limit?: number }) =>
      api.get(`${BASE}/api-keys`, { params }).then((r: any) => r.data),

    getApiKey: (id: string) =>
      api.get(`${BASE}/api-keys/${id}`).then((r: any) => r.data),

    createApiKey: (data: { name: string; permissions?: string[]; expiresAt?: string }) =>
      api.post(`${BASE}/api-keys`, data).then((r: any) => r.data),

    updateApiKey: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/api-keys/${id}`, data).then((r: any) => r.data),

    deleteApiKey: (id: string) =>
      api.delete(`${BASE}/api-keys/${id}`),

    // Masterdata
    getMasterdata: (params: { type: string; page?: number; limit?: number; isActive?: boolean }) =>
      api.get(`${BASE}/masterdata`, { params }).then((r: any) => r.data),

    createMasterdata: (data: any) =>
      api.post(`${BASE}/masterdata`, data).then((r: any) => r.data),

    updateMasterdata: (id: string, data: any) =>
      api.patch(`${BASE}/masterdata/${id}`, data).then((r: any) => r.data),

    deleteMasterdata: (id: string) =>
      api.delete(`${BASE}/masterdata/${id}`),

    // System Config
    getSystemConfigs: () =>
      api.get(`${BASE}/system-config`).then((r: any) => r.data),

    updateSystemConfigs: (data: Record<string, string>) =>
      api.post(`${BASE}/system-config/bulk-update`, data).then((r: any) => r.data),

    // Audit Logs
    getAuditLogs: (params: {
      page?: number; limit?: number; action?: string; entity?: string;
      entityId?: string; userId?: string; from?: string; to?: string;
    }) => api.get(`${BASE}/audit-logs`, { params }).then((r: any) => r.data),

    // Backup
    getBackupStatus: () =>
      api.get(`${BASE}/backup/status`).then((r: any) => r.data),

    getBackupRecords: (params?: { page?: number; limit?: number; type?: string }) =>
      api.get(`${BASE}/backup`, { params }).then((r: any) => r.data),

    runDatabaseBackup: () =>
      api.post(`${BASE}/backup/run/database`).then((r: any) => r.data),

    runMinioBackup: () =>
      api.post(`${BASE}/backup/run/minio`).then((r: any) => r.data),

    runRestoreTest: (id: string) =>
      api.post(`${BASE}/backup/${id}/restore-test`).then((r: any) => r.data),
  };
}

export const imageServiceApi = createImageServiceApi(api);
