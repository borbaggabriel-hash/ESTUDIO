export async function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers, credentials: "include" });

  if (res.status === 401) {
    const { memoryNavigate } = await import("@/lib/memory-router");
    memoryNavigate("/login");
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const data = await res.json();
      if (data.message) errorMsg = data.message;
    } catch {}
    throw new Error(errorMsg);
  }

  if (res.status === 204) return null;
  return res.json();
}
