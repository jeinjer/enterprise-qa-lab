import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { ErrorNotice } from "../../components/error-notice";
import { AvailabilityBadge } from "./availability-badge";
import { money, type Product } from "./product";
export function CatalogPage() {
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
                  <AvailabilityBadge product={p} />
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
