import { pool } from "./db.js";
try {
  await pool.query(`INSERT INTO products(id,name,description,price,stock,active) VALUES
 ('10000000-0000-4000-8000-000000000001','Orbit Desk Lamp','Adjustable desk lamp for a focused workspace.',49.90,12,true),
 ('10000000-0000-4000-8000-000000000002','Slate Notebook','A durable notebook for everyday ideas.',12.50,0,true),
 ('10000000-0000-4000-8000-000000000003','Archive Stand','Retired synthetic catalog fixture.',25.00,4,false)
 ON CONFLICT (id) DO NOTHING`);
  console.log(JSON.stringify({ event: "seed_complete" }));
} finally {
  await pool.end();
}
