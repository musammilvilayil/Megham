/** Thin fetch wrapper: JSON in, JSON out, and failures surface the server's message. */
export async function api<T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(url, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");
