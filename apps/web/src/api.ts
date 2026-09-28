export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public fields: Record<string, string[]>,
    public correlationId?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      credentials: "same-origin",
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new RequestError(
      "Unable to reach Northstar. Please try again.",
      "NETWORK_ERROR",
      {},
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new RequestError(
      data.error?.message ?? "Request failed.",
      data.error?.code ?? "REQUEST_FAILED",
      data.error?.fields ?? {},
      data.error?.correlationId,
    );
  return data;
}
