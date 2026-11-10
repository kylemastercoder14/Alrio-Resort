"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { CURRENT_PERMISSION_IDS } from "../../users-roles/_components/data";
import { PermissionSheet } from "../../users-roles/_components/user-role-form";

type RoleFormProps = {
  roleId: string;
};

export function RoleForm({ roleId }: RoleFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCreate = roleId === "create";
  const role = useQuery({
    ...trpc.resort.accessRoles.get.queryOptions({ id: roleId }),
    enabled: !isCreate,
    retry: false,
  });
  const saveRole = useMutation(
    trpc.resort.accessRoles.save.mutationOptions({
      onSuccess: async (savedRole) => {
        await queryClient.invalidateQueries(
          trpc.resort.accessRoles.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.accessRoles.get.queryFilter({ id: savedRole.id }),
        );
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
        toast.success("Role saved.");
        router.push("/resort/access/roles");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!isCreate && role.isPending) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
        Loading role...
      </div>
    );
  }

  if (!isCreate && role.isError) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Role not found.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/access/roles">Back to roles</Link>
        </Button>
      </div>
    );
  }

  return (
    <RoleEditor
      key={role.data?.id ?? "create"}
      initialDescription={role.data?.description ?? ""}
      initialName={role.data?.name ?? ""}
      initialPermissions={role.data?.permissions ?? []}
      isSaving={saveRole.isPending}
      mode={isCreate ? "create" : "update"}
      onSubmit={(values) =>
        saveRole.mutate({
          id: isCreate ? undefined : roleId,
          ...values,
        })
      }
    />
  );
}

function RoleEditor({
  initialDescription,
  initialName,
  initialPermissions,
  isSaving,
  mode,
  onSubmit,
}: {
  initialDescription: string;
  initialName: string;
  initialPermissions: string[];
  isSaving: boolean;
  mode: "create" | "update";
  onSubmit: (values: {
    description: string;
    name: string;
    permissions: string[];
  }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [selectedIds, setSelectedIds] = useState(() =>
    initialPermissions.includes("*")
      ? CURRENT_PERMISSION_IDS
      : initialPermissions.filter((permission) =>
          CURRENT_PERMISSION_IDS.includes(permission),
        ),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      description,
      name,
      permissions: selectedIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/access/roles">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : mode === "create" ? "Create role" : "Save changes"}
          </Button>
        </div>
      </div>

      <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-base font-bold text-[#303030]">Role details</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Roles define permissions for workspace users.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleName">Role name</Label>
          <Input
            id="roleName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Front office manager"
            className="rounded-lg"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleDescription">
            Description
            <span className="font-normal text-zinc-500">(optional)</span>
          </Label>
          <Textarea
            id="roleDescription"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe when this role should be assigned."
            className="min-h-24 rounded-lg"
          />
        </div>
      </Card>

      <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#303030]">Permissions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Users assigned this role inherit these workspace permissions.
            </p>
          </div>
          <PermissionSheet selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
          {selectedIds.length} permissions selected
        </div>
      </Card>
    </form>
  );
}
