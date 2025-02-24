import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; timestamp: number }>();

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();

  // Clean up old entries
  if (rateLimit.has(ip)) {
    const entry = rateLimit.get(ip)!;
    if (now - entry.timestamp > 60000) { // Reset after 1 minute
      rateLimit.delete(ip);
    }
  }

  // Get or create counter for this IP
  const counter = rateLimit.get(ip) ?? { count: 0, timestamp: now };
  counter.count++;

  // Update counter
  rateLimit.set(ip, counter);

  // If too many requests, return 429
  if (counter.count > 100) { // 100 requests per minute
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/inventions/:path*'],
}; 