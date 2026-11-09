import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fcfbfa] px-6">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-medium">
          Staff registration is invitation-only
        </h1>
        <p className="text-sm leading-6 text-zinc-500">
          Open the invitation link sent by Alrio Private Resort to create your
          staff account.
        </p>
        <Link href="/auth/sign-in" className="inline-block text-sm underline">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
