export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "principale";

  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  if (request.method === "GET") {
    const result = await env.DB.prepare("SELECT data, updated_at FROM app_data WHERE key = ?")
      .bind(key)
      .first();

    return new Response(
      JSON.stringify({
        data: result ? JSON.parse(result.data) : null,
        updatedAt: result ? result.updated_at : 0,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (request.method === "POST") {
    const body = await request.json();
    const payload = JSON.stringify(body);
    const incomingUpdatedAt = Number.isFinite(body.updatedAt)
      ? body.updatedAt
      : Date.parse(body.updatedAt) || Date.now();
    const existing = await env.DB.prepare(
      "SELECT updated_at, data FROM app_data WHERE key = ?"
    )
      .bind(key)
      .first();

    if (existing && existing.updated_at > incomingUpdatedAt) {
      return new Response(
        JSON.stringify({
          ok: false,
          reason: "conflict",
          data: JSON.parse(existing.data),
          updatedAt: existing.updated_at,
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const updatedAt = incomingUpdatedAt || Date.now();

    await env.DB.prepare(
      "INSERT INTO app_data (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
    )
      .bind(key, payload, updatedAt)
      .run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
