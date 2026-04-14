import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isLoginPage = nextUrl.pathname === "/login";
  const isProtected =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/subjects") ||
    nextUrl.pathname.startsWith("/roadmap") ||
    nextUrl.pathname.startsWith("/learn") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/pricing") ||
    nextUrl.pathname.startsWith("/quotations") ||
    nextUrl.pathname.startsWith("/console");

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|background.mp4).*)",
  ],
};
