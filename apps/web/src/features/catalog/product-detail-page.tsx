import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, RequestError } from "../../api";
import { ErrorNotice } from "../../components/error-notice";
import { AvailabilityBadge } from "./availability-badge";
import { money, type Product } from "./product";
export function ProductDetailPage() {
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
            <AvailabilityBadge product={p} />
            <p>{p.description}</p>
          </div>
        </div>
      ) : (
        <p role="status">Loading product…</p>
      )}
    </section>
  );
}
