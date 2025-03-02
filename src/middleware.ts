import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 150; // Increased from 100
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();

  // Clean up old entries
  if (rateLimit.has(ip)) {
    const entry = rateLimit.get(ip)!;
    if (now - entry.timestamp > RATE_LIMIT_WINDOW) { // Reset after 1 minute
      rateLimit.delete(ip);
    }
  }

  // Get or create counter for this IP
  const counter = rateLimit.get(ip) ?? { count: 0, timestamp: now };
  counter.count++;

  // Update counter
  rateLimit.set(ip, counter);

  // If too many requests, return 429
  if (counter.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((counter.timestamp + RATE_LIMIT_WINDOW - now) / 1000);
    
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((counter.timestamp + RATE_LIMIT_WINDOW) / 1000))
        }
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
  response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT - counter.count));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil((counter.timestamp + RATE_LIMIT_WINDOW) / 1000)));
  
  return response;
}

export const config = {
  matcher: ['/api/inventions/:path*'],
}; 