import { apiClient } from "../api-client";

export type UploadType = "product" | "employee" | "customer" | "repair" | "logo";

export interface UploadImageResult {
  id: string;
  url: string;
  type: UploadType;
  entityId: string | null;
}

// POST /api/v1/uploads/image (API Spec Chapter 52.1).
export async function uploadImage(type: UploadType, file: File, entityId?: string): Promise<UploadImageResult> {
  const form = new FormData();
  form.append("type", type);
  if (entityId) form.append("entityId", entityId);
  form.append("image", file);

  const { data } = await apiClient.post<{ data: UploadImageResult }>("/uploads/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

// DELETE /api/v1/uploads/image/{id} (API Spec Chapter 52.2).
export async function deleteImage(id: string): Promise<void> {
  await apiClient.delete(`/uploads/image/${encodeURIComponent(id)}`);
}
