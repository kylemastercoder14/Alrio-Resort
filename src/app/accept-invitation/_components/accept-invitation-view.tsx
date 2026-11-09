"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type AcceptInvitationViewProps = {
  token: string;
};

export function AcceptInvitationView({ token }: AcceptInvitationViewProps) {
  const trpc = useTRPC();
  const invitation = useQuery({
    ...trpc.auth.validateInvitation.queryOptions({ token }),
    enabled: Boolean(token),
  });

  if (!token) {
    return <InvalidInvite message="Invitation token missing." />;
  }

  if (invitation.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-9 w-36" />
      </div>
    );
  }

  if (invitation.isError) {
    return <InvalidInvite message={invitation.error.message} />;
  }

  const data = invitation.data;

  if (!data?.valid) {
    const reason = data?.reason === "expired" ? "Invitation expired." : "Invitation invalid.";
    return <InvalidInvite message={reason} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Accept invitation</h1>
        <p className="text-sm text-muted-foreground">
          You are invited to join {data.workspaceName} as {data.roleName}.
        </p>
      </div>
      <div className="rounded-lg border bg-white p-4 text-sm">
        <p>
          <span className="font-medium">Email:</span> {data.email}
        </p>
        <p>
          <span className="font-medium">Expires:</span>{" "}
          {new Date(data.expiresAt).toLocaleString()}
        </p>
        {data.message ? (
          <p className="mt-3 text-muted-foreground">{data.message}</p>
        ) : null}
      </div>
      <Button asChild size="sm">
        <Link href={`/auth/sign-up/staff/${encodeURIComponent(token)}`}>
          Continue to sign up
        </Link>
      </Button>
    </div>
  );
}

function InvalidInvite({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Invitation unavailable</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild size="sm" variant="outline">
        <Link href="/">Go back</Link>
      </Button>
    </div>
  );
}
