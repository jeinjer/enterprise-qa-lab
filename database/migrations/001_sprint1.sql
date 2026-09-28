CREATE TABLE customers (
 customer_id uuid PRIMARY KEY,
 first_name varchar(50) NOT NULL CHECK (length(first_name) BETWEEN 2 AND 50),
 last_name varchar(50) NOT NULL CHECK (length(last_name) BETWEEN 2 AND 50),
 dni varchar(8) NOT NULL UNIQUE CHECK (dni ~ '^[0-9]{7,8}$'),
 email varchar(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
 password_hash text NOT NULL,
 status text NOT NULL CHECK (status IN ('PENDING_VERIFICATION','ACTIVE')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE email_verification_tokens (
 token_hash char(64) PRIMARY KEY,
 customer_id uuid NOT NULL REFERENCES customers(customer_id),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 invalidated_at timestamptz
);
CREATE INDEX verification_customer_idx ON email_verification_tokens(customer_id);
CREATE TABLE sessions (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL);
CREATE INDEX sessions_expire_idx ON sessions(expire);
CREATE TABLE products (
 id uuid PRIMARY KEY,
 name text NOT NULL,
 description text NOT NULL,
 price numeric(12,2) NOT NULL CHECK (price >= 0),
 currency char(3) NOT NULL DEFAULT 'USD',
 stock integer NOT NULL CHECK (stock >= 0),
 active boolean NOT NULL DEFAULT true
);
