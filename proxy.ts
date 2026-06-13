import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Get user from cookie/session
  const user = request.cookies.get('auth_user');
  
  // Public routes that don't need auth
  const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Admin routes
  const isAdminRoute = pathname.startsWith('/admin');
  
  // User routes
  const isUserRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/courses') || pathname.startsWith('/profile');

  // If route is public, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, we check localStorage which happens client-side
  // So we'll just allow the request to proceed to the client
  // The client-side components will handle the actual auth check
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
