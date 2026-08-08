"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImage, deleteImage, type UploadType } from "@/lib/api/uploads";
import { getApiErrorMessage } from "@/lib/api-client";

interface ImageUploadFieldProps {
  type: UploadType;
  /** Omit for "logo" — the shop logo isn't tied to a specific record, backend treats it as a singleton. */
  entityId?: string;
  imageUrl: string | null;
  label: string;
  /** Query keys to invalidate after a successful upload/remove (e.g. the entity's list + detail queries). */
  invalidateQueryKeys: unknown[][];
}

/**
 * A small photo/attachment control — API Spec Chapter 52's "Frontend
 * Upload → Backend Validation → Cloudinary Upload → Save URL → Database"
 * flow, reused across Products, Employees, Customers, Repairs, and the shop
 * Logo. Only usable once the entity already exists (needs a real
 * entityId) — the one exception is "logo", which has no entityId at all.
 */
export function ImageUploadField({ type, entityId, imageUrl, label, invalidateQueryKeys }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const deleteId = type === "logo" ? "logo:shop" : `${type}:${entityId}`;

  function invalidateAll() {
    for (const key of invalidateQueryKeys) void queryClient.invalidateQueries({ queryKey: key });
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImage(type, file, entityId),
    onSuccess: () => {
      invalidateAll();
      toast.success(`${label} uploaded.`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteImage(deleteId),
    onSuccess: () => {
      invalidateAll();
      toast.success(`${label} removed.`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const pending = uploadMutation.isPending || removeMutation.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URLs, not a local asset
            <img src={imageUrl} alt={label} className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {uploadMutation.isPending ? "Uploading..." : imageUrl ? "Replace" : "Upload"}
          </Button>
          {imageUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={() => removeMutation.mutate()}
            >
              <X /> {removeMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
