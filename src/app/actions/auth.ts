"use server";

import { redirect } from "next/navigation";
import { destroySession, loginWithCredentials } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const result = await loginWithCredentials(email, password);
    if ("error" in result && result.error) {
      return { error: result.error };
    }
  } catch (err) {
    console.error("loginAction failed", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("AUTH_SECRET")) {
      return { error: "Server misconfigured: AUTH_SECRET is missing." };
    }
    if (
      message.includes("Can't reach database") ||
      message.includes("P1001") ||
      message.includes("P1017") ||
      message.includes("Mongo") ||
      message.includes("MONGODB_URI") ||
      message.includes("database")
    ) {
      return {
        error:
          "MongoDB is not reachable. Set MONGODB_URI to your Atlas cluster on Vercel.",
      };
    }
    return { error: "Login failed. Check server logs / env vars on Vercel." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
