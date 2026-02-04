/**
 * Role management utilities
 */

export type MemberRole = "player" | "coach" | "parent" | "admin";

export const ROLES: Record<MemberRole, MemberRole> = {
  player: "player",
  coach: "coach",
  parent: "parent",
  admin: "admin",
};

export const DEFAULT_ROLE: MemberRole = "player";

/**
 * Valid member roles
 */
export const VALID_ROLES: MemberRole[] = ["player", "coach", "parent", "admin"];

/**
 * Validate if a role is valid
 */
export function isValidRole(role: string): role is MemberRole {
  return VALID_ROLES.includes(role as MemberRole);
}

/**
 * Normalize role (defaults to "player" if invalid)
 */
export function normalizeRole(role?: string | null): MemberRole {
  if (!role) {
    return DEFAULT_ROLE;
  }
  
  if (isValidRole(role)) {
    return role;
  }
  
  return DEFAULT_ROLE;
}

/**
 * Check if a role has permission to perform an action
 */
export function hasPermission(
  userRole: MemberRole | undefined,
  requiredRole: MemberRole | MemberRole[]
): boolean {
  const role = normalizeRole(userRole);
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  return requiredRoles.includes(role);
}

/**
 * Check if role is admin
 */
export function isAdmin(role: MemberRole | undefined): boolean {
  return normalizeRole(role) === "admin";
}

/**
 * Check if role is coach or admin
 */
export function isStaff(role: MemberRole | undefined): boolean {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "coach" || normalizedRole === "admin";
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: MemberRole | undefined): number {
  const normalizedRole = normalizeRole(role);
  
  switch (normalizedRole) {
    case "admin":
      return 4;
    case "coach":
      return 3;
    case "parent":
      return 2;
    case "player":
      return 1;
    default:
      return 0;
  }
}

/**
 * Check if user role has at least the required level
 */
export function hasMinimumRole(
  userRole: MemberRole | undefined,
  minimumRole: MemberRole
): boolean {
  const userLevel = getRoleLevel(userRole);
  const minimumLevel = getRoleLevel(minimumRole);
  
  return userLevel >= minimumLevel;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: MemberRole | undefined): string {
  const normalizedRole = normalizeRole(role);
  
  switch (normalizedRole) {
    case "admin":
      return "Administrator";
    case "coach":
      return "Coach";
    case "parent":
      return "Parent";
    case "player":
      return "Player";
    default:
      return "Player";
  }
}

/**
 * Get all roles that can be assigned (for admin use)
 */
export function getAssignableRoles(): MemberRole[] {
  return [...VALID_ROLES];
}
