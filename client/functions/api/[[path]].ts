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
  env: { API_ORIGIN: string };
}) => {
  const url = new URL(request.url);
  const upstream = new URL(env.API_ORIGIN);
  upstream.pathname = url.pathname;
  upstream.search = url.search;

  const upstreamRequest = new Request(upstream.toString(), request);
  return fetch(upstreamRequest);
};
