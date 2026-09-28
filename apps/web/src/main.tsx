import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api, RequestError } from "./api";
import "./styles.css";
type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
};
const Auth = createContext<{
  customer: Customer | null;
  refresh: () => Promise<void>;
}>({ customer: null, refresh: async () => {} });
function ErrorNotice({ error }: { error: unknown }) {
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
function App() {
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
    <Auth.Provider value={{ customer, refresh }}>
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
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/:id" element={<ProductDetail />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
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
    </Auth.Provider>
  );
}
function Logout() {
  const { refresh } = useContext(Auth);
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
type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  available: boolean;
};
const money = (p: Product) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency,
  }).format(Number(p.price));
function Availability({ product }: { product: Product }) {
  return (
    <span className={`availability ${product.available ? "" : "unavailable"}`}>
      {product.available ? "In stock" : "Unavailable · Out of stock"}
    </span>
  );
}
function Catalog() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setProducts(null);
    setError(null);
    api<{ products: Product[] }>("/products")
      .then((v) => {
        if (alive) setProducts(v.products);
      })
      .catch((e) => {
        if (alive) setError(e);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  return (
    <>
      <section className="intro">
        <p className="eyebrow">THE EVERYDAY COLLECTION</p>
        <h1>
          A little more focus.
          <br />A better workspace.
        </h1>
        <p>Thoughtful office essentials for the work ahead.</p>
      </section>
      <section>
        <div className="section-heading">
          <h2>Explore the catalog</h2>
          <span>
            {products ? `${products.length} products` : "Northstar essentials"}
          </span>
        </div>
        <ErrorNotice error={error} />
        {error ? (
          <button onClick={() => setAttempt((v) => v + 1)}>Try again</button>
        ) : products === null ? (
          <p role="status">Loading products…</p>
        ) : products.length === 0 ? (
          <p>No products are currently available.</p>
        ) : (
          <div className="grid">
            {products.map((p, index) => (
              <Link to={`/catalog/${p.id}`} className="product-card" key={p.id}>
                <div className="product-art" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div className="abstract-object" />
                </div>
                <div className="product-info">
                  <Availability product={p} />
                  <h3>{p.name}</h3>
                  <p>
                    {money(p)} <span>View details →</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
function ProductDetail() {
  const { id } = useParams();
  const [p, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setProduct(null);
    setError(null);
    api<{ product: Product }>(`/products/${encodeURIComponent(id ?? "")}`)
      .then((v) => {
        if (alive) setProduct(v.product);
      })
      .catch((e) => {
        if (alive) setError(e);
      });
    return () => {
      alive = false;
    };
  }, [id, attempt]);
  return (
    <section>
      <Link to="/catalog">← Back to catalog</Link>
      <ErrorNotice error={error} />
      {error ? (
        <>
          <h1>
            {error instanceof RequestError && error.code === "PRODUCT_NOT_FOUND"
              ? "Product not found"
              : "Unable to load product"}
          </h1>
          <button onClick={() => setAttempt((v) => v + 1)}>Try again</button>
        </>
      ) : p ? (
        <div className="detail">
          <div className="product-art" aria-hidden="true">
            <div className="abstract-object" />
          </div>
          <div>
            <p className="eyebrow">NORTHSTAR ESSENTIALS</p>
            <h1>{p.name}</h1>
            <p className="price">{money(p)}</p>
            <Availability product={p} />
            <p>{p.description}</p>
          </div>
        </div>
      ) : (
        <p role="status">Loading product…</p>
      )}
    </section>
  );
}
function FormPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="form-panel">
      <p className="eyebrow">YOUR NORTHSTAR ACCOUNT</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}
function Field({
  name,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  autoComplete?: string;
}) {
  return (
    <label htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <span className="field-error" id={`${name}-error`}>
          {error.join(" ")}
        </span>
      )}
    </label>
  );
}
const initial = {
  firstName: "",
  lastName: "",
  dni: "",
  email: "",
  emailConfirmation: "",
  password: "",
  passwordConfirmation: "",
};
function Register() {
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
        <Resend initialEmail={data.email} />
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
function Login() {
  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useContext(Auth);
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
          <Resend initialEmail={data.email} />
        )}
      <p>
        New here? <Link to="/register">Create an account</Link>
      </p>
    </FormPanel>
  );
}
function Resend({ initialEmail = "" }: { initialEmail?: string }) {
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
function Verify() {
  const { refresh } = useContext(Auth);
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
          <Resend />
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
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
