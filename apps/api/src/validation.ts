import { z } from "zod";
const name = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[\p{L} '\-]+$/u, "Use letters, spaces, hyphens or apostrophes");
export const registration = z
  .object({
    firstName: name,
    lastName: name,
    dni: z
      .string()
      .trim()
      .regex(/^[0-9]{7,8}$/, "Use 7–8 digits"),
    email: z
      .string()
      .refine((v) => z.email().safeParse(v.trim()).success, "Invalid email")
      .refine((v) => v.trim().length <= 254, "Maximum 254 characters"),
    emailConfirmation: z.string(),
    password: z
      .string()
      .min(8)
      .max(64)
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[^\p{L}\p{N}\s]/u, "Include a special character"),
    passwordConfirmation: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.email !== v.emailConfirmation)
      ctx.addIssue({
        code: "custom",
        path: ["emailConfirmation"],
        message: "Emails must match exactly",
      });
    if (v.password !== v.passwordConfirmation)
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirmation"],
        message: "Passwords must match exactly",
      });
  })
  .transform((v) => ({ ...v, email: v.email.trim().toLowerCase() }));
export const emailInput = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const login = z.object({
  email: emailInput,
  password: z.string().min(1).max(64),
});
