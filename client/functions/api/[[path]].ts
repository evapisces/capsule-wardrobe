// Cloudflare Pages Function: proxies every /api/* request straight through
// to the real backend on DigitalOcean. This makes the browser see the API
// as same-origin with the client, so the session cookie is first-party —
// no cross-site cookie handling, and no Safari/iOS ITP interference with
// the OAuth redirect chain.
export const onRequest = async ({
  request,
  env,
}: {
  request: Request;
  env: { API_ORIGIN?: string };
}) => {
  try {
    if (!env.API_ORIGIN) {
      return new Response('Misconfigured proxy: API_ORIGIN is not set', { status: 500 });
    }

    const url = new URL(request.url);
    const upstream = new URL(env.API_ORIGIN);
    upstream.pathname = url.pathname;
    upstream.search = url.search;

    // The OAuth routes respond with 3xx redirects (to Google, then back to
    // the client) that must reach the browser as-is, not be followed by
    // this Worker itself.
    const upstreamRequest = new Request(upstream.toString(), request);
    return await fetch(upstreamRequest, { redirect: 'manual' });
  } catch (err) {
    return new Response(`Proxy error: ${err instanceof Error ? err.message : String(err)}`, {
      status: 502,
    });
  }
};
