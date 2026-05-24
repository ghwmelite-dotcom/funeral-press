// Edge helpers (Workers runtime) shared by the dynamic-route Pages Functions.

// Fetch the prebuilt SPA shell (index.html) via the Pages ASSETS binding.
export async function loadShell(context) {
  const url = new URL('/index.html', context.request.url)
  const res = await context.env.ASSETS.fetch(new Request(url, { headers: context.request.headers }))
  return res.text()
}

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
