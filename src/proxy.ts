import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: bounce visitors without a session cookie to the login page.
// Every admin page and action still verifies the session against the database.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
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
