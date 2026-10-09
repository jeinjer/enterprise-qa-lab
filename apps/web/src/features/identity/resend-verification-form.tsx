import { useState } from "react";
import { api, RequestError } from "../../api";
import { ErrorNotice } from "../../components/error-notice";
import { Field } from "./components/form-field";
export function ResendVerificationForm({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setError(null);
        try {
          const result = await api<{ message: string }>(
            "/auth/verification/resend",
            { email },
          );
          setMessage(result.message);
        } catch (e) {
          setError(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Need a new verification link?</h2>
      <Field
        name="resendEmail"
        label="Account email"
        type="email"
        value={email}
        onChange={setEmail}
        error={error instanceof RequestError ? error.fields.email : undefined}
      />
      <ErrorNotice error={error} />
      {message && <p role="status">{message}</p>}
      <button disabled={busy}>
        {busy ? "Sending…" : "Resend verification"}
      </button>
    </form>
  );
}
