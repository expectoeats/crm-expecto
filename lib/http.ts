export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiEnvelope<T>> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`/api${normalizedPath}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | { message?: string };

  // 401 = cookie expired or missing → redirect to login
  if (response.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.replace("/login");
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("message" in data && data.message ? data.message : "Request failed");
  }

  return data as ApiEnvelope<T>;
}
