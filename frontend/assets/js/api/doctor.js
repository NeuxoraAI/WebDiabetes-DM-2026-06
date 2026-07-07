import { apiFetch } from "./client.js";

export const getMe = () => apiFetch("/api/doctor/me");
export const updateMe = (data) =>
  apiFetch("/api/doctor/me", { method: "PATCH", body: JSON.stringify(data) });
export const getRegisteredPatients = () => apiFetch("/api/doctor/registered-patients");
export const addPatient = (patientId) =>
  apiFetch(`/api/doctor/patients/${patientId}/add`, { method: "POST" });
export const getMyPatients = () => apiFetch("/api/doctor/patients");
export const getPatientDetail = (patientId) => apiFetch(`/api/doctor/patients/${patientId}`);
export const getPatientAdherence = (patientId) =>
  apiFetch(`/api/doctor/patients/${patientId}/adherence`);
export const getPatientClinical = (patientId) =>
  apiFetch(`/api/doctor/patients/${patientId}/clinical`);
export const addPatientClinical = (patientId, record) =>
  apiFetch(`/api/doctor/patients/${patientId}/clinical`, {
    method: "POST",
    body: JSON.stringify(record),
  });
export const getPatientMessages = (patientId) =>
  apiFetch(`/api/doctor/patients/${patientId}/messages`);
export const replyPatient = (patientId, content) =>
  apiFetch(`/api/doctor/patients/${patientId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
export const getInbox = () => apiFetch("/api/doctor/inbox");
