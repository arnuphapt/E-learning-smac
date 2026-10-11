import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isTutorOnlyRole } from "@/lib/roles";

// What an external-domain (tutor-only) user may reach besides the public routes: tutor pages, the tutor API and the
// lesson-file redirect (tutor lesson video). Everything else is refused here AND re-checked in the routes themselves.
const inside = (pathname, base) => pathname === base || pathname.startsWith(base + "/");

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes. NOTE: `pathname.includes(".")` lets through anything with a dot (static files) before any auth
  // check; it is only safe because no page or API route of this app has a dot in its path. Keep it that way.
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If not authenticated and trying to access protected routes
  if (!token && (pathname.startsWith("/s") || pathname.startsWith("/i"))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Tutor-only users (external domains): tutor mode and nothing else. A page sends them to /s/tutor (this is also where
  // the login callback /s/courses lands them), an API answers 403.
  if (token && isTutorOnlyRole(token.role)) {
    if (inside(pathname, "/s/tutor") || inside(pathname, "/api/tutor") || pathname === "/api/files") return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/s/tutor", request.url));
  }

  // If authenticated, check roles
  if (token) {
    const role = token.role || "student";
    

    
    // Student trying to access instructor routes
    if (pathname.startsWith("/i/") && role === "student") {
      return NextResponse.redirect(new URL("/s/courses", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
