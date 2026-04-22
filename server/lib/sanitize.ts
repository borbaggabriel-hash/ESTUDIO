/**
 * Strip sensitive fields from user objects before sending to clients.
 */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, "passwordHash"> {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe as Omit<T, "passwordHash">;
}

export function sanitizeUsers<T extends Record<string, any>>(users: T[]): Omit<T, "passwordHash">[] {
  return users.map(sanitizeUser);
}
