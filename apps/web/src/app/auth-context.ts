import { createContext } from "react";

export type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export const AuthContext = createContext<{
  customer: Customer | null;
  refresh: () => Promise<void>;
}>({ customer: null, refresh: async () => {} });
