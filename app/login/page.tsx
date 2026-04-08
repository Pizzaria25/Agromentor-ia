"use client";

import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    window.location.replace("/register");
  }, []);
  return null;
}
