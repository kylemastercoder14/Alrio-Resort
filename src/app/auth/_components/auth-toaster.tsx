"use client";

import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

export function AuthToaster() {
  return <Toaster position="top-center" containerStyle={{ zIndex: 2000 }} toastOptions={{ duration: 5000 }} />;
}

export function useAuthError(message: string | null | undefined, id: string, version = 0) {
  useEffect(() => {
    if (message) toast.error(message, { id });
  }, [message, id, version]);
}
