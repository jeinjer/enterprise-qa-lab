import { useContext, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, RequestError } from "../../api";
import { AuthContext } from "../../app/auth-context";
import { ErrorNotice } from "../../components/error-notice";
import { Field } from "./components/form-field";
import { FormPanel } from "./components/form-panel";
import { ResendVerificationForm } from "./resend-verification-form";
export function LoginPage() {
  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useContext(AuthContext);
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login", data);
      await refresh();
      navigate("/catalog");
    } catch (e) {
      setError(e);
    } finally {
      setData((v) => ({ ...v, password: "" }));
      setBusy(false);
    }
  }
  return (
    <FormPanel title="Welcome back">
      <ErrorNotice error={error} />
      <form onSubmit={submit} noValidate>
        <Field
          name="email"
          label="Email"
          type="email"
          value={data.email}
          onChange={(email) => setData((v) => ({ ...v, email }))}
          autoComplete="email"
          error={error instanceof RequestError ? error.fields.email : undefined}
        />
        <Field
          name="password"
          label="Password"
          type="password"
          value={data.password}
          onChange={(password) => setData((v) => ({ ...v, password }))}
          autoComplete="current-password"
          error={
            error instanceof RequestError ? error.fields.password : undefined
          }
        />
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error instanceof RequestError &&
        error.code === "VERIFICATION_REQUIRED" && (
          <ResendVerificationForm initialEmail={data.email} />
        )}
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </FormPanel>
  );
}
