import { useContext, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, RequestError } from "./api";
import { AuthContext, type Customer } from "./app/auth-context";
import { ErrorNotice } from "./components/error-notice";
import { CatalogPage } from "./features/catalog/catalog-page";
import { LoginPage } from "./features/identity/login-page";
import { RegisterPage } from "./features/identity/register-page";
import { VerifyPage } from "./features/identity/verify-page";
import { ProductDetailPage } from "./features/catalog/product-detail-page";
export function App() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<unknown>(null);
  async function refresh() {
    try {
      const result = await api<{ customer: Customer }>("/auth/session");
      setCustomer(result.customer);
      setError(null);
    } catch (e) {
      setCustomer(null);
      if (e instanceof RequestError && e.code === "AUTH_REQUIRED") {
        setError(null);
      } else {
        throw e;
      }
    }
  }
  useEffect(() => {
    void refresh().catch(setError);
  }, []);
  return (
    <AuthContext.Provider value={{ customer, refresh }}>
      <header>
        <Link className="brand" to="/catalog">
          ✦ NORTHSTAR<span>COMMERCE</span>
        </Link>
        <nav>
          <Link to="/catalog">Catalog</Link>
          {customer ? (
            <>
              <span>Hello, {customer.first_name}</span>
              <Logout />
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="button small" to="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <ErrorNotice error={error} />
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/:id" element={<ProductDetailPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route
            path="*"
            element={
              <section>
                <h1>Page not found</h1>
                <Link to="/catalog">Back to catalog</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        Northstar Commerce · Personal QA laboratory · Synthetic data only{" "}
        <span>Sprint 1 · 0.1.0</span>
      </footer>
    </AuthContext.Provider>
  );
}
function Logout() {
  const { refresh } = useContext(AuthContext);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await api("/auth/logout", {});
            await refresh();
            navigate("/catalog");
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        Sign out
      </button>
      <ErrorNotice error={error} />
    </div>
  );
}
