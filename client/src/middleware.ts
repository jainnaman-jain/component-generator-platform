import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/login' || path === '/signup';

  // Get the token from the user's cookies
  const token = request.cookies.get('authToken')?.value || '';

  // If user is logged in and tries to access login/signup, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // If user is not logged in and tries to access a protected path, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }
  
  // Allow the request to proceed if no redirect is needed
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
  ],
};