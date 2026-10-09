import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db.js";
import { ApiError } from "../../errors.js";
export const catalog = Router();
const columns = "id,name,description,price,currency,(stock>0) AS available";
catalog.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT ${columns} FROM products WHERE active=true ORDER BY name,id`,
  );
  res.json({ products: result.rows });
});
catalog.get("/:id", async (req, res) => {
  if (!z.uuid().safeParse(req.params.id).success)
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const result = await pool.query(
    `SELECT ${columns} FROM products WHERE id=$1 AND active=true`,
    [req.params.id],
  );
  if (!result.rowCount)
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  res.json({ product: result.rows[0] });
});
