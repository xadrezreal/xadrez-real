export function isPremiumOrAdmin(role: string): boolean {
  return role === "PREMIUM" || role === "ADMIN";
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN";
}
