import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  // Auth temporarily disabled – pass through directly
  return <>{children}</>;
}
