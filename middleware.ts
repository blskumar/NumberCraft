import { NextResponse, type NextRequest } from 'next/server';
import firebaseConfig from './firebase-applet-config.json';
import { FUNCTIONS_REGION } from './lib/backend-config';

const isDev = process.env.NODE_ENV !== 'production';
const reportUri = process.env.CSP_REPORT_URI; // placeholder: set to a collector URL to enable

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced Next bootstrap load chunks and the lazily
    // injected reCAPTCHA script; the host entries are a fallback for old browsers.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/${isDev ? " 'unsafe-eval'" : ''}`,
    // Elements (<style>) need the nonce; style="" attributes (motion, inline
    // widths) cannot be nonced, so only the attribute channel allows inline.
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ''}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://picsum.photos",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://firestore.googleapis.com',
      'https://firebaseappcheck.googleapis.com',
      `https://${FUNCTIONS_REGION}-${firebaseConfig.projectId}.cloudfunctions.net`,
      'https://www.google.com/recaptcha/',
      'https://www.recaptcha.net/recaptcha/',
      ...(isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
    ].join(' '),
    `frame-src https://${firebaseConfig.authDomain} https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
    ...(reportUri ? [`report-uri ${reportUri}`] : []),
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next reads this request header to stamp its own inline/bootstrap scripts.
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
