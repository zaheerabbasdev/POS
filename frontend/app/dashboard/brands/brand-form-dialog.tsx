"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBrand, updateBrand, type Brand } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const brandFormSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required."),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
}

export function BrandFormDialog({ open, onOpenChange, brand }: BrandFormDialogProps) {
  const isEditing = Boolean(brand);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { name: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: brand?.name ?? "", description: brand?.description ?? "", status: brand?.status ?? "active" });
    }
  }, [open, brand, reset]);

  const mutation = useMutation({
    mutationFn: (values: BrandFormValues) =>
      isEditing ? updateBrand(brand!.id, values) : createBrand(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success(isEditing ? "Brand updated." : "Brand created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Brand" : "Add Brand"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this brand's details." : "Create a new mobile phone or accessory brand."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="brand-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="brand-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="brand-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="brand-description" rows={3} {...register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              items={STATUS_ITEMS}
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "active" | "inactive")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
