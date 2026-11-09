"use client";

import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconExternalLink } from "@tabler/icons-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

export function InviteUserDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [roleId, setRoleId] = useState("");
  const [role, setRole] = useState("");
  const accessRoles = useQuery({
    ...trpc.resort.accessRoles.list.queryOptions(),
    retry: false,
  });
  const inviteUser = useMutation(
    trpc.resort.usersRoles.invite.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
        toast.success("Invitation email sent.");
        setEmail("");
        setRoleId("");
        setRole("");
        setMessage("");
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roleId || !role.trim()) {
      toast.error("Role is required.");
      return;
    }

    inviteUser.mutate({
      email,
      accessRoleId: roleId,
      roleName: role,
      message,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs">
          <IconExternalLink className="size-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg!">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            Prepare an invitation for a staff member to join this workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email address</Label>
            <Input
              id="inviteEmail"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <input type="hidden" name="role" value={role} />
            <Select
              value={roleId}
              onValueChange={(value) => {
                const selectedRole = accessRoles.data?.find((item) => item.id === value);

                setRoleId(value);
                setRole(selectedRole?.name ?? "");
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-lg">
                <SelectValue placeholder="Select workspace role" />
              </SelectTrigger>
              <SelectContent>
                {(accessRoles.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteMessage">
              Message
              <span className="font-normal text-zinc-500">
                (optional)
              </span>
            </Label>
            <Textarea
              id="inviteMessage"
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add short context for this invite..."
              className="min-h-24 rounded-lg"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              size="sm"
              disabled={inviteUser.isPending}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
