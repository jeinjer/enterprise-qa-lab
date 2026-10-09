import type { Product } from "./product";

export function AvailabilityBadge({ product }: { product: Product }) {
  return (
    <span className={`availability ${product.available ? "" : "unavailable"}`}>
      {product.available ? "In stock" : "Unavailable · Out of stock"}
    </span>
  );
}
