const isAdmin = process.env.ADMIN_EMAILS
  ?.split(",")
  .map(e => e.trim().toLowerCase())
  .includes(user.email.toLowerCase());

await websitePool.query(
  `
  INSERT INTO web_users (email, name, status, role)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (email)
  DO UPDATE SET
    last_login_at = now(),
    status = EXCLUDED.status,
    role = EXCLUDED.role
  `,
  [
    user.email.toLowerCase(),
    user.name ?? null,
    isAdmin ? "approved" : "pending",
    isAdmin ? "admin" : "manager",
  ]
);
