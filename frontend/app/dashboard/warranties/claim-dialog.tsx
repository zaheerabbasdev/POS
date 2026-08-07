"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createWarrantyClaim, type Warranty } from "@/lib/api/warranties";
import { getApiErrorMessage } from "@/lib/api-client";

interface ClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty?: Warranty;
}

export function ClaimDialog({ open, onOpenChange, warranty }: ClaimDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {warranty ? <ClaimDialogBody key={warranty.id} warranty={warranty} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ClaimDialogBody({ warranty, onOpenChange }: { warranty: Warranty; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [issue, setIssue] = useState("");

  const mutation = useMutation({
    mutationFn: () => createWarrantyClaim({ warrantyId: warranty.id, issue }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast.success("Claim registered — a repair ticket was opened.");
      // See repair-form-dialog.tsx — navigating away unmounts this dialog
      // anyway, and calling onOpenChange(false) right before router.push()
      // can race Base UI's close transition against that unmount.
      router.push(`/dashboard/repairs/${result.repairId}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Claim Warranty — {warranty.product}</DialogTitle>
        <DialogDescription>
          {warranty.customer} · Invoice {warranty.invoiceNumber} · Expires{" "}
          {new Date(warranty.expiryDate).toLocaleDateString()}. Filing a claim opens a repair ticket at no charge.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="claim-issue" className="text-sm font-medium">
          Issue
        </label>
        <Textarea id="claim-issue" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} autoFocus />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={!issue.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Submitting..." : "Submit Claim"}
        </Button>
      </DialogFooter>
    </>
  );
}
