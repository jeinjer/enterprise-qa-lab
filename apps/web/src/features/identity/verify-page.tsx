import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { AuthContext } from "../../app/auth-context";
import { ErrorNotice } from "../../components/error-notice";
import { FormPanel } from "./components/form-panel";
import { ResendVerificationForm } from "./resend-verification-form";
export function VerifyPage() {
  const { refresh } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    window.history.replaceState(null, "", "/verify");
    if (!token) {
      setError(
        new Error(
          "The verification link is missing its token. Request a new message.",
        ),
      );
      return;
    }
    void api("/auth/verification/confirm", { token })
      .then(async () => {
        await refresh();
        navigate("/catalog", { replace: true });
      })
      .catch(setError);
  }, []);
  return (
    <FormPanel title="Verify your email">
      {error ? (
        <>
          <ErrorNotice error={error} />
          <ResendVerificationForm />
          <p>
            If your account was already verified,{" "}
            <Link to="/login">sign in</Link>.
          </p>
        </>
      ) : (
        <p role="status">Verifying your email…</p>
      )}
    </FormPanel>
  );
}
