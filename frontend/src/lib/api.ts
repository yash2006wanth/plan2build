import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.BACKEND_URL || 'http://localhost:8000/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDashboardSummary = async (projectId: number = 1) => {
  const res = await api.get(`/projects/${projectId}/dashboard`);
  return res.data;
};

export const getProjects = async () => {
  const res = await api.get('/projects');
  return res.data;
};

export const getProjectDetails = async (projectId: number) => {
  const res = await api.get(`/projects/${projectId}`);
  return res.data;
};

export const getProjectActivities = async (projectId: number = 1) => {
  const res = await api.get(`/schedules/projects/${projectId}/activities`);
  return res.data;
};

export const getActivityDetails = async (activityId: number) => {
  const res = await api.get(`/schedules/activities/${activityId}`);
  return res.data;
};

export const getSiteReports = async (projectId: number = 1) => {
  const res = await api.get(`/site-reports/projects/${projectId}`);
  return res.data;
};

export const submitSiteReport = async (formData: FormData) => {
  const res = await api.post('/site-reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const approveActivityMatch = async (reportId: number, approvedActivityId: number) => {
  const res = await api.post(`/site-reports/${reportId}/approve-match`, {
    approved_activity_id: approvedActivityId,
  });
  return res.data;
};

export const getProjectAlerts = async (projectId: number = 1) => {
  const res = await api.get(`/alerts/projects/${projectId}/alerts`);
  return res.data;
};

export const markAlertAsRead = async (alertId: number) => {
  const res = await api.put(`/alerts/alerts/${alertId}/read`);
  return res.data;
};

export const previewScheduleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/schedules/upload/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const confirmScheduleUpload = async (projectId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/schedules/${projectId}/upload/confirm`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const triggerDemoUpdate = async (projectId: number = 1) => {
  const res = await api.post(`/demo/run-update?project_id=${projectId}`);
  return res.data;
};

export const ingestExecutionText = (projectId: number, text: string) => api.post('/execution/ingest/text', { project_id: projectId, text });
export const getExecutionEvents = (projectId: number) => api.get(`/execution/events?project_id=${projectId}`);
export const getExecutionAnalytics = (projectId: number) => api.get(`/execution/analytics?project_id=${projectId}`);
