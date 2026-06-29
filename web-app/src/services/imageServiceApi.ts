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

    reprocessImage: (id: string) => api.post(`${BASE}/images/${id}/reprocess`).then((r: any) => r.data),

    bulkDeletePreview: (days: number) =>
      api.get(`${BASE}/images/bulk-delete-preview`, { params: { days } }).then((r: any) => r.data),

    bulkDeleteByAge: (days: number, password: string) =>
      api.post(`${BASE}/images/bulk-delete`, { days, password }).then((r: any) => r.data),

    // Trash
    getTrashImages: (params?: { page?: number; limit?: number }) =>
      api.get(`${BASE}/images/trash`, { params }).then((r: any) => r.data),

    restoreImage: (id: string) =>
      api.post(`${BASE}/images/${id}/restore`).then((r: any) => r.data),

    restoreAllImages: () =>
      api.post(`${BASE}/images/trash/restore-all`).then((r: any) => r.data),

    emptyTrash: (password: string) =>
      api.post(`${BASE}/images/trash/empty`, { password }).then((r: any) => r.data),

    // Cameras
    getCameras: (params?: { status?: string; enabled?: boolean }) =>
      api.get(`${BASE}/cameras`, { params }).then((r: any) => r.data),

    getCamera: (id: string) => api.get(`${BASE}/cameras/${id}`).then((r: any) => r.data),

    createCamera: (data: Record<string, unknown>) =>
      api.post(`${BASE}/cameras`, data).then((r: any) => r.data),

    updateCamera: (id: string, data: Record<string, unknown>) =>
      api.patch(`${BASE}/cameras/${id}`, data).then((r: any) => r.data),

    deactivateCamera: (id: string) => api.delete(`${BASE}/cameras/${id}`),

    deleteCamera: (id: string, password: string) =>
      api.delete(`${BASE}/cameras/${id}`, { data: { password } }).then((r: any) => r.data),

    deleteCameraPermanent: (id: string, password: string) =>
      api.delete(`${BASE}/cameras/${id}/permanent`, { data: { password } }).then((r: any) => r.data),

    getDeletedCameras: () =>
      api.get(`${BASE}/cameras/trash`).then((r: any) => r.data),

    restoreCamera: (id: string) =>
      api.post(`${BASE}/cameras/${id}/restore`).then((r: any) => r.data),

    emptyCameraTrash: (password: string) =>
      api.post(`${BASE}/cameras/trash/empty`, { password }).then((r: any) => r.data),

    scanNow: () => api.post(`${BASE}/cameras/scan-now`).then((r: any) => r.data),

    scanCamera: (id: string) => api.post(`${BASE}/cameras/${id}/scan`).then((r: any) => r.data),

    // Camera Analytics
    getCameraAnalytics: (id: string, period?: string) =>
      api.get(`${BASE}/cameras/${id}/analytics`, { params: { period } }).then((r: any) => r.data),

    getCameraComparison: (period?: string) =>
      api.get(`${BASE}/cameras/analytics/comparison`, { params: { period } }).then((r: any) => r.data),

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

    runStorageBackup: () =>
      api.post(`${BASE}/backup/run/storage`).then((r: any) => r.data),

    runRestoreTest: (id: string) =>
      api.post(`${BASE}/backup/${id}/restore-test`).then((r: any) => r.data),

    // Image File Blob (for authenticated preview/download)
    getImageFileBlob: (id: string, fileType: string) =>
      api.get(`${BASE}/images/${id}/files/${fileType}`, { responseType: 'blob' }).then((r: any) => r.data),

    // Trends (Executive Dashboard)
    getTrends: (period: string) =>
      api.get(`${BASE}/processing-logs/trends`, { params: { period } }).then((r: any) => r.data),

    // Storage Providers
    getStorageProviders: (params?: {}) =>
      api.get(`${BASE}/storage-providers`, { params }).then((r: any) => r.data),

    getStorageProvider: (id: string) =>
      api.get(`${BASE}/storage-providers/${id}`).then((r: any) => r.data),

    createStorageProvider: (data: any) =>
      api.post(`${BASE}/storage-providers`, data).then((r: any) => r.data),

    updateStorageProvider: (id: string, data: any) =>
      api.patch(`${BASE}/storage-providers/${id}`, data).then((r: any) => r.data),

    deleteStorageProvider: (id: string) =>
      api.delete(`${BASE}/storage-providers/${id}`),

    testStorageProvider: (id: string) =>
      api.post(`${BASE}/storage-providers/${id}/test`).then((r: any) => r.data),

    getStorageProviderMetrics: (id: string) =>
      api.get(`${BASE}/storage-providers/${id}/metrics`).then((r: any) => r.data),

    // Storage Profiles
    getStorageProfiles: () =>
      api.get(`${BASE}/storage-profiles`).then((r: any) => r.data),

    getStorageProfile: (id: string) =>
      api.get(`${BASE}/storage-profiles/${id}`).then((r: any) => r.data),

    createStorageProfile: (data: any) =>
      api.post(`${BASE}/storage-profiles`, data).then((r: any) => r.data),

    updateStorageProfile: (id: string, data: any) =>
      api.patch(`${BASE}/storage-profiles/${id}`, data).then((r: any) => r.data),

    deleteStorageProfile: (id: string) =>
      api.delete(`${BASE}/storage-profiles/${id}`).then((r: any) => r.data),

    resolveStorageProfile: (params?: { fileType?: string; tagKey?: string; tagValue?: string; cameraId?: string }) =>
      api.get(`${BASE}/storage-profiles/resolve`, { params }).then((r: any) => r.data),

    // Migration Jobs
    getMigrationJobs: (params?: { status?: string }) =>
      api.get(`${BASE}/migrations`, { params }).then((r: any) => r.data),

    createMigrationJob: (data: { sourceId: string; targetId: string; fileType?: string }) =>
      api.post(`${BASE}/migrations`, data).then((r: any) => r.data),

    runMigrationJob: (id: string) =>
      api.post(`${BASE}/migrations/${id}/run`).then((r: any) => r.data),

    cancelMigrationJob: (id: string) =>
      api.post(`${BASE}/migrations/${id}/cancel`).then((r: any) => r.data),

    // Universal Search
    universalSearch: (q: string) =>
      api.get(`${BASE}/search`, { params: { q } }).then((r: any) => r.data),

    // Alerts bulk actions
    clearAllAlerts: () => api.post(`${BASE}/alerts/clear-all`).then((r: any) => r.data),
    acknowledgeAllAlerts: () => api.post(`${BASE}/alerts/acknowledge-all`).then((r: any) => r.data),
    getUnacknowledgedCount: () => api.get(`${BASE}/alerts/unacknowledged-count`).then((r: any) => r.data),

    // Admin
    clearAllData: (data: { password: string; confirmation: string }) =>
      api.post(`${BASE}/admin/clear-all-data`, data).then((r: any) => r.data),
  };
}

export const imageServiceApi = createImageServiceApi(api);
