import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isOwnerRoute = createRouteMatcher(["/dashboard(.*)", "/preview(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isOwnerRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/sign-in");
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
