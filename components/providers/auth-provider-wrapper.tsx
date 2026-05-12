"use client";

import { AuthProvider } from "./auth-context";

export const AuthProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <AuthProvider>{children}</AuthProvider>;
};
