"use server";

import { redirect } from "next/navigation";
import { destroySession, loginWithCredentials } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const result = await loginWithCredentials(email, password);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
