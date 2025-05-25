
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANDIDATE_HOSTNAME = 'candidate.talentflow.local';
// Add HR_HOSTNAME if you want to explicitly handle it, otherwise localhost and other hostnames will default to HR portal.
// const HR_HOSTNAME = 'hr.talentflow.local';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host')?.split(':')[0]; // Remove port

  if (hostname === CANDIDATE_HOSTNAME) {
    // If accessing the root of the candidate portal, rewrite to candidate login
    if (url.pathname === '/') {
      url.pathname = '/candidate/login';
      return NextResponse.rewrite(url);
    }
    // For other paths, prepend /candidate to the path
    // e.g., candidate.talentflow.local/dashboard becomes /candidate/dashboard
    if (!url.pathname.startsWith('/candidate')) {
      url.pathname = `/candidate${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // For hr.talentflow.local or localhost, let requests pass through to existing app structure
  // No rewrite needed for these hostnames as the HR portal is at the root
  return NextResponse.next();
}

export const config = {
  // Matcher to run middleware on all non-API, non-static file requests
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
