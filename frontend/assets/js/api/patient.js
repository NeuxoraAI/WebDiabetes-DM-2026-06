import { apiFetch } from "./client.js";

export const getMe = () => apiFetch("/api/patient/me");
export const updateMe = (data) =>
  apiFetch("/api/patient/me", { method: "PATCH", body: JSON.stringify(data) });
export const getQuestions = () => apiFetch("/api/patient/adherence/questions");
export const getAdherenceHistory = () => apiFetch("/api/patient/adherence");
export const submitQuestionnaire = (answers) =>
  apiFetch("/api/patient/adherence", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
export const getClinicalHistory = () => apiFetch("/api/patient/clinical");
export const addClinicalRecord = (record) =>
  apiFetch("/api/patient/clinical", {
    method: "POST",
    body: JSON.stringify(record),
  });
export const getMessages = () => apiFetch("/api/patient/messages");
export const sendMessage = (content) =>
  apiFetch("/api/patient/messages", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
