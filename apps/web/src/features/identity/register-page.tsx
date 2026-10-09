import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, RequestError } from "../../api";
import { ErrorNotice } from "../../components/error-notice";
import { Field } from "./components/form-field";
import { FormPanel } from "./components/form-panel";
import { ResendVerificationForm } from "./resend-verification-form";
const initial = {
  firstName: "",
  lastName: "",
  dni: "",
  email: "",
  emailConfirmation: "",
  password: "",
  passwordConfirmation: "",
};
export function RegisterPage() {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/register", data);
      setDone(true);
    } catch (e) {
      setError(e);
    } finally {
      setData((v) => ({ ...v, password: "", passwordConfirmation: "" }));
      setBusy(false);
    }
  }
  if (done)
    return (
      <FormPanel title="Check your email">
        <p>
          Your account is pending verification. Open the captured message in the
          local Mailpit inbox and follow its link within 30 minutes.
        </p>
        <ResendVerificationForm initialEmail={data.email} />
        <Link to="/catalog">Continue browsing</Link>
      </FormPanel>
    );
  return (
    <FormPanel title="Create your account">
      <p>Use synthetic customer information for this laboratory.</p>
      <ErrorNotice error={error} />
      <form onSubmit={submit} noValidate>
        {(Object.keys(initial) as (keyof typeof initial)[]).map((name) => (
          <Field
            key={name}
            name={name}
            label={
              {
                firstName: "First name",
                lastName: "Last name",
                dni: "DNI",
                email: "Email",
                emailConfirmation: "Confirm email",
                password: "Password",
                passwordConfirmation: "Confirm password",
              }[name]
            }
            type={
              name.toLowerCase().includes("password")
                ? "password"
                : name.toLowerCase().includes("email")
                  ? "email"
                  : "text"
            }
            value={data[name]}
            onChange={(value) => setData((v) => ({ ...v, [name]: value }))}
            error={
              error instanceof RequestError ? error.fields[name] : undefined
            }
            autoComplete={
              name.toLowerCase().includes("password")
                ? "new-password"
                : name === "email"
                  ? "email"
                  : "off"
            }
          />
        ))}
        <small>
          Password: 8–64 characters, at least one uppercase letter and one
          special character. Names: 2–50 characters. DNI: 7–8 digits.
        </small>
        <button className="primary" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </FormPanel>
  );
}
