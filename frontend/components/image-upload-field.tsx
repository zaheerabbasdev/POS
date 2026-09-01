"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";
import { Button, Stack, Text, Group, ActionIcon } from "@mantine/core";
import { uploadImage, deleteImage, type UploadType } from "@/lib/api/uploads";
import { getApiErrorMessage } from "@/lib/api-client";

interface ImageUploadFieldProps {
  type: UploadType;
  entityId?: string;
  imageUrl: string | null;
  label: string;
  invalidateQueryKeys: unknown[][];
}

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
    <Stack gap="xs">
      <Text size="sm" fw={500}>{label}</Text>
      <Group gap="md">
        <div style={{
          width: 64,
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: "var(--mantine-radius-md)",
          border: "1px solid var(--mantine-color-gray-3)",
          backgroundColor: "var(--mantine-color-gray-0)"
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImageIcon size={24} style={{ color: "var(--mantine-color-gray-5)" }} />
          )}
        </div>
        <Stack gap="xs">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={pending}
            loading={uploadMutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? "Replace" : "Upload"}
          </Button>
          {imageUrl ? (
            <Button
              type="button"
              variant="subtle"
              color="red"
              size="sm"
              disabled={pending}
              loading={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
              leftSection={<X size={16} />}
              style={{ justifyContent: "flex-start", padding: "0 4px" }}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
      </Group>
    </Stack>
  );
}
