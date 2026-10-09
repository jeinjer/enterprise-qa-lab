import { RequestError } from "../api";
export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <p>
        {error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      {error instanceof RequestError && error.correlationId && (
        <small>Reference: {error.correlationId}</small>
      )}
    </div>
  );
}
