import type { NextConfig } from 'next';

// The Hono API is a separate process. Proxy /api/* to it so the browser is
// always same-origin and the streka_session cookie keeps working unchanged.
// Server routes live at the root, so /api/auth/x -> ${origin}/auth/x.
const apiOrigin = process.env.STREKA_API_ORIGIN ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // @streka/tokens ships raw TS (main: src/index.ts); Next must transpile it.
  transpilePackages: ['@streka/tokens'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
