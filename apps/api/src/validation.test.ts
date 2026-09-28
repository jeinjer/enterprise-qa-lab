import { test } from "node:test";
import assert from "node:assert/strict";
import { registration, login } from "./validation.js";
const valid = {
  firstName: " Ana ",
  lastName: "O'Neill",
  dni: " 12345678 ",
  email: " CUSTOMER@example.test ",
  emailConfirmation: " CUSTOMER@example.test ",
  password: "Password!",
  passwordConfirmation: "Password!",
};
test("registration trims identity fields and normalizes email after literal comparison", () => {
  const value = registration.parse(valid);
  assert.equal(value.firstName, "Ana");
  assert.equal(value.dni, "12345678");
  assert.equal(value.email, "customer@example.test");
  assert.equal(
    registration.safeParse({
      ...valid,
      emailConfirmation: "customer@example.test",
    }).success,
    false,
  );
});
test("password is preserved literally and confirmation must match", () => {
  const value = registration.parse({
    ...valid,
    password: " Password! ",
    passwordConfirmation: " Password! ",
  });
  assert.equal(value.password, " Password! ");
  assert.equal(
    registration.safeParse({ ...valid, passwordConfirmation: "password!" })
      .success,
    false,
  );
});
test("registration rejects invalid names, DNI and password boundaries", () => {
  for (const patch of [
    { firstName: "A" },
    { lastName: "Name2" },
    { dni: "123456" },
    { dni: "123456789" },
    { dni: "1234a678" },
    { password: "Abcdef!" },
    { password: "a".repeat(65) + "A!" },
    { password: "password!" },
    { password: "Password1" },
  ])
    assert.equal(registration.safeParse({ ...valid, ...patch }).success, false);
  for (const firstName of ["Álvaro", "Anne-Marie", "李明"])
    assert.equal(registration.safeParse({ ...valid, firstName }).success, true);
});
test("login normalizes email but leaves password unchanged", () => {
  assert.deepEqual(
    login.parse({ email: " USER@EXAMPLE.TEST ", password: " pass " }),
    { email: "user@example.test", password: " pass " },
  );
  assert.equal(
    login.safeParse({ email: "invalid", password: "" }).success,
    false,
  );
});
