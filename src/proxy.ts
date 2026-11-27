import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "breakledger_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  let authed = false;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = authed ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  const isLogin = pathname === "/login";

  if (!authed && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (pathname === "/home" || pathname === "/transactions") {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/home" ? "/dashboard" : "/expenses";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*|icon).*)"],
};
