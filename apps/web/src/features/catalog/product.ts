export type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  available: boolean;
};

export const money = (product: Product) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(Number(product.price));
