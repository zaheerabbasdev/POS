"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequirePermission } from "@/components/require-permission";
import { fetchSubscriptionPlans, type SubscriptionPlan } from "@/lib/api/subscription-plans";
import { PlanFormDialog } from "./plan-form-dialog";

function AdminSubscriptionPlansPageContent() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | undefined>(undefined);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin", "subscription-plans"],
    queryFn: fetchSubscriptionPlans,
  });

  const openCreate = () => {
    setEditingPlan(undefined);
    setFormOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscription Plans</h1>
          <p className="text-muted-foreground">Plans shops can subscribe to from their own Subscription page.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Create Plan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : plans && plans.length > 0 ? (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      {Number(plan.price) > 0 ? `${plan.currency} ${plan.price}` : "Free"}
                    </TableCell>
                    <TableCell>{plan.billingInterval}</TableCell>
                    <TableCell>{plan.durationDays > 0 ? `${plan.durationDays} days` : "No expiry"}</TableCell>
                    <TableCell>
                      {plan.isTrial ? <Badge variant="outline">Trial</Badge> : <Badge variant="secondary">Paid</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No plans yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlanFormDialog open={formOpen} onOpenChange={setFormOpen} plan={editingPlan} />
    </div>
  );
}

export default function AdminSubscriptionPlansPage() {
  return (
    <RequirePermission permissions={["PLATFORM_PLAN_VIEW", "PLATFORM_PLAN_MANAGE"]}>
      <AdminSubscriptionPlansPageContent />
    </RequirePermission>
  );
}
