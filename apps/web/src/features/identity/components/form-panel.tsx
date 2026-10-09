import type { ReactNode } from "react";

export function FormPanel({
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
