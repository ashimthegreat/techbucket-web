import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: bounce visitors without a session cookie to the login page.
// Every admin page and action still verifies the session against the database.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedOutPages = ["/admin/login", "/admin/forgot", "/admin/reset"];
  if (pathname.startsWith("/admin") && !signedOutPages.includes(pathname)) {
    if (!request.cookies.get("tb_session")?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
