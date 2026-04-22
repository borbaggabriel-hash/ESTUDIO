import { useMemo } from "react";
import { DIRECTOR_ROLES, PRIVILEGED_PLATFORM_ROLES } from "../pages/room.constants";

interface Session {
  participants?: Array<{
    userId: string;
    role?: string;
  }>;
}

interface User {
  id: string;
  role?: string;
}

interface UseUserRoleParams {
  user: User | null | undefined;
  session: Session | null | undefined;
}

interface UseUserRoleResult {
  /** User's role within the current session */
  sessionRole: string;
  /** Whether user has platform-level privileges (platform_owner or diretor) */
  isPrivileged: boolean;
  /** Whether user is a director (can approve takes, manage permissions) */
  isDirector: boolean;
  /** Whether user can control video playback */
  canControl: boolean;
}

/**
 * Hook to centralize user role checks for the studio room
 * Unifies the logic for determining user permissions based on:
 * - Platform-level role (user.role)
 * - Session-level role (participant.role)
 */
export function useUserRole({
  user,
  session,
}: UseUserRoleParams): UseUserRoleResult {
  const sessionRole = useMemo(() => {
    const role = session?.participants?.find((p) => p.userId === user?.id)?.role;
    return String(role || "").toLowerCase();
  }, [session, user?.id]);

  const isPrivileged = useMemo(() => {
    const userPlatformRole = String(user?.role || "").toLowerCase();
    
    // Platform owner always has full control
    if (userPlatformRole === "platform_owner") return true;
    
    // Director (diretor) has full studio control
    if (PRIVILEGED_PLATFORM_ROLES.includes(userPlatformRole as any)) return true;
    
    // Check session participant role for director
    return DIRECTOR_ROLES.includes(sessionRole as any);
  }, [user?.role, sessionRole]);

  const isDirector = useMemo(() => {
    if (user?.role === "platform_owner") return true;
    if (user?.role === "diretor") return true;
    return sessionRole === "diretor";
  }, [sessionRole, user?.role]);

  const canControl = useMemo(() => {
    // Privileged users can always control
    // For non-privileged, this would need globalControlEnabled and controlPermissions
    // which are managed separately in the component
    return isPrivileged;
  }, [isPrivileged]);

  return {
    sessionRole,
    isPrivileged,
    isDirector,
    canControl,
  };
}
