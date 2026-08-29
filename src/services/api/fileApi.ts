import { apiConfig, ApiError, request, refreshAccessToken } from "./apiClient";
import { getTokens } from "./tokenStorage";
import type { ApiFile, ApiFolder, PaginatedResponse } from "./types";

export type FileListParams = { search?: string; mimeType?: string; folderId?: string; page?: number; limit?: number; sort?: string };

export const listFiles = (params: FileListParams = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return request<PaginatedResponse<ApiFile>>(`/files${query.toString() ? `?${query}` : ""}`);
};

export const listFolders = () => request<ApiFolder[]>("/files/folders");
export const createFolder = (name: string, parentId?: string | null) => request<ApiFolder>("/files/folders", { method: "POST", body: JSON.stringify({ name, parentId: parentId || undefined }) });
export const updateFolder = (id: string, name: string) => request<ApiFolder>(`/files/folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const deleteFolder = (id: string) => request<{ message: string }>(`/files/folders/${id}`, { method: "DELETE" });
export const deleteFile = (id: string) => request<{ message: string }>(`/files/${id}`, { method: "DELETE" });
export const getFileContent = (id: string) => request<{ id: string; originalName: string; mimeType: string; extractionStatus: string; extractedText: string | null; extractionError: string | null }>(`/files/${id}/content`);

export const uploadFileWithProgress = (file: File, options: { folderId?: string; label?: string; onProgress?: (percent: number) => void } = {}): Promise<ApiFile> => new Promise((resolve, reject) => {
  const tokens = getTokens();
  if (!tokens?.accessToken) { reject(new ApiError(401, "Authentication required")); return; }
  const form = new FormData();
  form.append("file", file);
  if (options.folderId) form.append("folderId", options.folderId);
  if (options.label) form.append("label", options.label);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${apiConfig.baseUrl}/files/upload`);
  xhr.setRequestHeader("Authorization", `Bearer ${tokens.accessToken}`);
  xhr.upload.onprogress = (event) => { if (event.lengthComputable) options.onProgress?.(Math.round(event.loaded / event.total * 100)); };
  xhr.onerror = () => reject(new Error("Server bilan bog'lanib bo'lmadi."));
  xhr.onload = () => {
    let body: unknown = null;
    try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { body = null; }
    if (xhr.status >= 200 && xhr.status < 300) { resolve(body as ApiFile); return; }
    const message = typeof body === "object" && body !== null && "message" in body ? String((body as { message: unknown }).message) : "Upload failed";
    reject(new ApiError(xhr.status, message, body));
  };
  xhr.send(form);
});

export const downloadFile = async (id: string): Promise<Blob> => {
  let token = getTokens()?.accessToken;
  if (!token) throw new ApiError(401, "Authentication required");
  let response = await fetch(`${apiConfig.baseUrl}/files/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) {
    token = (await refreshAccessToken()).accessToken;
    response = await fetch(`${apiConfig.baseUrl}/files/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
  }
  if (!response.ok) throw new ApiError(response.status, "File download failed");
  return response.blob();
};
