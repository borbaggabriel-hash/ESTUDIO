import { db } from "./db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  studios,
  users,
  studioProfiles,
  studioMemberships,
  userStudioRoles,
  userRoles,
  productions,
  sessions,
  sessionParticipants,
  characters,
  staff,
  platformSettings,
  auditLog,
  takes,
  notifications,
  type Studio,
  type User,
  type StudioMembership,
  type UserStudioRole,
  type Production,
  type Session,
  type SessionParticipant,
  type Character,
  type Staff,
  type PlatformSetting,
  type AuditLog,
  type Take,
  type Notification,
  insertStudioSchema,
  insertProductionSchema,
  insertCharacterSchema,
  insertSessionSchema,
  insertSessionParticipantSchema,
  insertTakeSchema,
  insertAuditLogSchema,
  insertStaffSchema,
  insertPlatformSettingSchema,
  insertStudioMembershipSchema,
  insertNotificationSchema,
} from "@shared/schema";
import { userProfiles } from "@shared/models/auth";
import type { z } from "zod";

type InsertStudio = z.infer<typeof insertStudioSchema>;
type InsertProduction = z.infer<typeof insertProductionSchema>;
type InsertCharacter = z.infer<typeof insertCharacterSchema>;
type InsertSession = z.infer<typeof insertSessionSchema>;
type InsertSessionParticipant = z.infer<typeof insertSessionParticipantSchema>;
type InsertTake = z.infer<typeof insertTakeSchema>;
type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
type InsertStaff = z.infer<typeof insertStaffSchema>;
type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
type InsertMembership = z.infer<typeof insertStudioMembershipSchema>;
type InsertNotification = z.infer<typeof insertNotificationSchema>;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserStatus(id: string, status: string): Promise<User>;

  getStudios(): Promise<Studio[]>;
  getStudiosForUser(userId: string): Promise<Studio[]>;
  getStudio(id: string): Promise<Studio | undefined>;
  createStudio(studio: InsertStudio, creatorId: string, studioAdminUserId?: string): Promise<Studio>;

  getProductions(studioId: string): Promise<Production[]>;
  getPublicProductions(): Promise<Production[]>;
  getProduction(id: string): Promise<Production | undefined>;
  createProduction(production: InsertProduction): Promise<Production>;

  getCharacters(productionId: string): Promise<Character[]>;
  createCharacter(character: InsertCharacter): Promise<Character>;

  getSessions(studioId: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;

  getSessionParticipants(sessionId: string): Promise<SessionParticipant[]>;
  addSessionParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant>;

  getTakes(sessionId: string): Promise<Take[]>;
  createTake(take: InsertTake): Promise<Take>;
  updateTakeAudioUrl(takeId: string, audioUrl: string): Promise<void>;
  setPreferredTake(takeId: string): Promise<Take>;

  getAuditLogs(userId?: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  getStaff(studioId: string): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;

  getSetting(key: string): Promise<string | null>;
  getAllSettings(): Promise<Record<string, string>>;
  upsertSetting(key: string, value: string): Promise<void>;

  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  updateStudio(id: string, data: Partial<Studio>): Promise<Studio>;
  deleteStudio(id: string): Promise<void>;

  getAllProductions(): Promise<Production[]>;
  deleteProduction(id: string): Promise<void>;

  getAllSessions(): Promise<Session[]>;
  updateSession(id: string, data: Partial<Pick<Session, "title" | "status" | "scheduledAt" | "durationMinutes">>): Promise<Session>;
  deleteSession(id: string): Promise<void>;

  getAllTakes(): Promise<Take[]>;
  deleteTake(id: string): Promise<void>;
  getStudioTakesGrouped(studioId: string): Promise<any[]>;
  getAllTakesGrouped(): Promise<any[]>;
  getTakesByIds(ids: string[]): Promise<any[]>;
  getSessionTakesWithDetails(sessionId: string): Promise<any[]>;
  getProductionTakesWithDetails(productionId: string): Promise<any[]>;

  getSystemStats(): Promise<{ users: number; studios: number; productions: number; sessions: number; takes: number; pendingUsers: number }>;
  getStudioAdmins(studioId: string): Promise<User[]>;
  getPendingUsersWithStudioInfo(): Promise<any[]>;

  getStudioMemberships(studioId: string): Promise<(StudioMembership & { user?: User })[]>;
  getMembershipsByUser(userId: string): Promise<StudioMembership[]>;
  createMembership(membership: InsertMembership): Promise<StudioMembership>;
  updateMembershipStatus(id: string, status: string, role?: string): Promise<StudioMembership>;
  getMembership(id: string): Promise<StudioMembership | undefined>;

  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  getUserStudioRoles(membershipId: string): Promise<UserStudioRole[]>;
  getUserRolesInStudio(userId: string, studioId: string): Promise<string[]>;
  addUserStudioRole(membershipId: string, role: string): Promise<UserStudioRole>;
  removeUserStudioRole(membershipId: string, role: string): Promise<void>;
  setUserStudioRoles(membershipId: string, roles: string[]): Promise<UserStudioRole[]>;
  verifyUserStudioAccess(userId: string, studioId: string): Promise<boolean>;
  getActiveStudiosPublic(): Promise<{ id: string; name: string }[]>;
  getStudioStats(studioId: string): Promise<{ members: number; productions: number; sessions: number; takes: number; pendingMembers: number }>;
  getPendingMembersForStudio(studioId: string): Promise<(StudioMembership & { user?: User })[]>;

  getUserProfile(userId: string): Promise<any>;
  upsertUserProfile(userId: string, patch: Record<string, any>): Promise<any>;
  getStudioProfile(studioId: string): Promise<any>;
  upsertStudioProfile(studioId: string, patch: Record<string, any>): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    const [updated] = await db.update(users).set({ status }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUserProfile(userId: string): Promise<any> {
    const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return row?.data || {};
  }

  async upsertUserProfile(userId: string, patch: Record<string, any>): Promise<any> {
    const existing = await this.getUserProfile(userId);
    const data = { ...(existing || {}), ...(patch || {}) };
    const [row] = await db
      .insert(userProfiles)
      .values({ userId, data })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { data, updatedAt: new Date() } })
      .returning();
    return row?.data || data;
  }

  async getStudioProfile(studioId: string): Promise<any> {
    const [row] = await db.select().from(studioProfiles).where(eq(studioProfiles.studioId, studioId));
    return row?.data || {};
  }

  async upsertStudioProfile(studioId: string, patch: Record<string, any>): Promise<any> {
    const existing = await this.getStudioProfile(studioId);
    const data = { ...(existing || {}), ...(patch || {}) };
    const [row] = await db
      .insert(studioProfiles)
      .values({ studioId, data })
      .onConflictDoUpdate({ target: studioProfiles.studioId, set: { data, updatedAt: new Date() } })
      .returning();
    return row?.data || data;
  }

  async getStudios(): Promise<Studio[]> {
    return await db.select().from(studios);
  }

  async getStudiosForUser(userId: string): Promise<Studio[]> {
    const memberships = await db.select({ studioId: studioMemberships.studioId })
      .from(studioMemberships)
      .where(and(eq(studioMemberships.userId, userId), eq(studioMemberships.status, "approved")));
    if (memberships.length === 0) return [];
    const studioIds = memberships.map(m => m.studioId);
    return await db.select().from(studios).where(inArray(studios.id, studioIds));
  }

  async getStudio(id: string): Promise<Studio | undefined> {
    const [studio] = await db.select().from(studios).where(eq(studios.id, id));
    return studio;
  }

  async createStudio(studio: InsertStudio, creatorId: string, studioAdminUserId?: string): Promise<Studio> {
    const [newStudio] = await db.insert(studios).values(studio).returning();
    const adminUserId = studioAdminUserId || creatorId;
    const [membership] = await db.insert(studioMemberships).values({
      userId: adminUserId,
      studioId: newStudio.id,
      role: 'studio_admin',
      status: 'approved'
    }).returning();
    await db.insert(userStudioRoles).values({ membershipId: membership.id, role: 'studio_admin' });
    return newStudio;
  }

  async getProductions(studioId: string): Promise<Production[]> {
    return await db.select().from(productions).where(eq(productions.studioId, studioId));
  }

  async getPublicProductions(): Promise<Production[]> {
    return await db.select().from(productions).where(eq(productions.isPublic, true));
  }

  async getProduction(id: string): Promise<Production | undefined> {
    const [prod] = await db.select().from(productions).where(eq(productions.id, id));
    return prod;
  }

  async createProduction(production: InsertProduction): Promise<Production> {
    const [newProduction] = await db.insert(productions).values(production).returning();
    return newProduction;
  }

  async getCharacters(productionId: string): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.productionId, productionId));
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const [newChar] = await db.insert(characters).values(character).returning();
    return newChar;
  }

  async getSessions(studioId: string): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.studioId, studioId));
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values({
      ...session,
      scheduledAt: new Date(session.scheduledAt)
    }).returning();
    return newSession;
  }

  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return await db.select().from(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));
  }

  async addSessionParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant> {
    const [newParticipant] = await db.insert(sessionParticipants).values(participant).returning();
    return newParticipant;
  }

  async getTakes(sessionId: string): Promise<Take[]> {
    return await db.select().from(takes).where(eq(takes.sessionId, sessionId));
  }

  async createTake(take: InsertTake): Promise<Take> {
    const [newTake] = await db.insert(takes).values(take).returning();

    if (newTake.qualityScore !== null) {
      const existingTakes = await db.select()
        .from(takes)
        .where(and(
          eq(takes.sessionId, newTake.sessionId),
          eq(takes.lineIndex, newTake.lineIndex)
        ));

      let bestTake = newTake;
      for (const t of existingTakes) {
        if ((t.qualityScore || 0) > (bestTake.qualityScore || 0)) {
          bestTake = t;
        }
      }

      await db.update(takes)
        .set({ aiRecommended: false })
        .where(and(
          eq(takes.sessionId, newTake.sessionId),
          eq(takes.lineIndex, newTake.lineIndex)
        ));

      await db.update(takes)
        .set({ aiRecommended: true })
        .where(eq(takes.id, bestTake.id));
    }

    return newTake;
  }

  async updateTakeAudioUrl(takeId: string, audioUrl: string): Promise<void> {
    await db.update(takes).set({ audioUrl }).where(eq(takes.id, takeId));
  }

  async updateTakeDuration(takeId: string, durationSeconds: number): Promise<void> {
    await db.update(takes).set({ durationSeconds }).where(eq(takes.id, takeId));
  }

  async setPreferredTake(takeId: string): Promise<Take> {
    const [targetTake] = await db.select().from(takes).where(eq(takes.id, takeId));
    if (!targetTake) throw new Error("Take not found");

    await db.update(takes)
      .set({ isPreferred: false })
      .where(and(
        eq(takes.sessionId, targetTake.sessionId),
        eq(takes.lineIndex, targetTake.lineIndex)
      ));

    const [updated] = await db.update(takes)
      .set({ isPreferred: true })
      .where(eq(takes.id, takeId))
      .returning();
    return updated;
  }

  async getAuditLogs(userId?: string, limit = 100, offset = 0): Promise<AuditLog[]> {
    if (userId) {
      return await db.select().from(auditLog).where(eq(auditLog.userId, userId)).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset);
    }
    return await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLog).values(log).returning();
    return newLog;
  }

  async getStaff(studioId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.studioId, studioId));
  }

  async createStaff(newStaff: InsertStaff): Promise<Staff> {
    const [createdStaff] = await db.insert(staff).values(newStaff).returning();
    return createdStaff;
  }

  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting?.value ?? null;
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await db.select().from(platformSettings);
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    await db.insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getAllUsers(limit = 200, offset = 0): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const { id: _id, createdAt: _c, ...rest } = data as any;
    const [updated] = await db.update(users).set(rest).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    // Nullify takes.reviewedBy (nullable FK)
    await db.update(takes).set({ reviewedBy: null } as any).where(eq(takes.reviewedBy, id));
    // Delete takes where voiceActorId = id
    await db.delete(takes).where(eq(takes.voiceActorId, id));
    // Delete session participants
    await db.delete(sessionParticipants).where(eq(sessionParticipants.userId, id));
    // Delete notifications
    await db.delete(notifications).where(eq(notifications.userId, id));
    // Delete audit log entries
    await db.delete(auditLog).where(eq(auditLog.userId, id));
    // Delete userRoles
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    // Delete studio memberships (userStudioRoles cascade via DB)
    await db.delete(studioMemberships).where(eq(studioMemberships.userId, id));
    // Delete characters voice actor reference (set null via update)
    await db.update(characters).set({ voiceActorId: null } as any).where(eq(characters.voiceActorId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async updateStudio(id: string, data: Partial<Studio>): Promise<Studio> {
    const { id: _id, createdAt: _c, ...rest } = data as any;
    const [updated] = await db.update(studios).set(rest).where(eq(studios.id, id)).returning();
    return updated;
  }

  async deleteStudio(id: string): Promise<void> {
    // Get all productions for this studio
    const studioProds = await db.select({ id: productions.id }).from(productions).where(eq(productions.studioId, id));
    for (const prod of studioProds) {
      await this.deleteProduction(prod.id);
    }
    // Delete staff
    await db.delete(staff).where(eq(staff.studioId, id));
    // Delete memberships (userStudioRoles cascade via DB)
    await db.delete(studioMemberships).where(eq(studioMemberships.studioId, id));
    // studioProfiles has onDelete: cascade — will auto-delete
    await db.delete(studios).where(eq(studios.id, id));
  }

  async getAllProductions(): Promise<Production[]> {
    return await db.select().from(productions).orderBy(desc(productions.createdAt));
  }

  async deleteProduction(id: string): Promise<void> {
    // Get all sessions for this production
    const prodSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.productionId, id));
    for (const sess of prodSessions) {
      await this.deleteSession(sess.id);
    }
    // Delete characters
    await db.delete(characters).where(eq(characters.productionId, id));
    await db.delete(productions).where(eq(productions.id, id));
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.createdAt));
  }

  async updateSession(id: string, data: Partial<Pick<Session, "title" | "status" | "scheduledAt" | "durationMinutes">>): Promise<Session> {
    const [updated] = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning();
    return updated;
  }

  async deleteSession(id: string): Promise<void> {
    // Delete takes first
    await db.delete(takes).where(eq(takes.sessionId, id));
    // Delete participants
    await db.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, id));
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getAllTakes(): Promise<Take[]> {
    return await db.select().from(takes).orderBy(desc(takes.createdAt));
  }

  async deleteTake(id: string): Promise<void> {
    await db.delete(takes).where(eq(takes.id, id));
  }

  private async takesWithDetails(whereClause?: any): Promise<any[]> {
    const query = db
      .select({
        id: takes.id,
        sessionId: takes.sessionId,
        characterId: takes.characterId,
        voiceActorId: takes.voiceActorId,
        lineIndex: takes.lineIndex,
        audioUrl: takes.audioUrl,
        durationSeconds: takes.durationSeconds,
        isPreferred: takes.isPreferred,
        qualityScore: takes.qualityScore,
        aiRecommended: takes.aiRecommended,
        createdAt: takes.createdAt,
        characterName: characters.name,
        voiceActorName: sql<string>`COALESCE(NULLIF(${takes.voiceActorName}, ''), ${users.displayName})`,
        sessionTitle: sessions.title,
        productionId: sessions.productionId,
        productionName: productions.name,
        studioId: sessions.studioId,
        studioName: studios.name,
      })
      .from(takes)
      .innerJoin(sessions, eq(takes.sessionId, sessions.id))
      .innerJoin(productions, eq(sessions.productionId, productions.id))
      .innerJoin(studios, eq(sessions.studioId, studios.id))
      .leftJoin(characters, eq(takes.characterId, characters.id))
      .leftJoin(users, eq(takes.voiceActorId, users.id))
      .orderBy(desc(takes.createdAt));

    if (whereClause) {
      return await query.where(whereClause);
    }
    return await query;
  }

  async getStudioTakesGrouped(studioId: string): Promise<any[]> {
    return this.takesWithDetails(eq(sessions.studioId, studioId));
  }

  async getAllTakesGrouped(): Promise<any[]> {
    return this.takesWithDetails();
  }

  async getTakesByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    return this.takesWithDetails(inArray(takes.id, ids));
  }

  async getSessionTakesWithDetails(sessionId: string): Promise<any[]> {
    return this.takesWithDetails(eq(takes.sessionId, sessionId));
  }

  async getProductionTakesWithDetails(productionId: string): Promise<any[]> {
    return this.takesWithDetails(eq(sessions.productionId, productionId));
  }

  async getSystemStats(): Promise<{ users: number; studios: number; productions: number; sessions: number; takes: number; pendingUsers: number }> {
    const [userCount] = await db.select({ count: db.$count(users) }).from(users);
    const [studioCount] = await db.select({ count: db.$count(studios) }).from(studios);
    const [prodCount] = await db.select({ count: db.$count(productions) }).from(productions);
    const [sessCount] = await db.select({ count: db.$count(sessions) }).from(sessions);
    const [takesCount] = await db.select({ count: db.$count(takes) }).from(takes);
    const [pendingResult] = await db.select({ count: db.$count(users) }).from(users).where(eq(users.status, "pending"));
    const pendingCount = Number(pendingResult?.count ?? 0);
    return {
      users: Number(userCount?.count ?? 0),
      studios: Number(studioCount?.count ?? 0),
      productions: Number(prodCount?.count ?? 0),
      sessions: Number(sessCount?.count ?? 0),
      takes: Number(takesCount?.count ?? 0),
      pendingUsers: pendingCount,
    };
  }

  async getStudioAdmins(studioId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(studioMemberships)
      .innerJoin(users, eq(users.id, studioMemberships.userId))
      .leftJoin(userStudioRoles, eq(userStudioRoles.membershipId, studioMemberships.id))
      .where(and(
        eq(studioMemberships.studioId, studioId),
        eq(studioMemberships.status, "approved"),
        sql`(${studioMemberships.role} = 'studio_admin' OR ${userStudioRoles.role} = 'studio_admin')`
      ));
    const seen = new Set<string>();
    return result.filter(r => {
      if (seen.has(r.user.id)) return false;
      seen.add(r.user.id);
      return true;
    }).map(r => r.user);
  }

  async getPendingUsersWithStudioInfo(): Promise<any[]> {
    const pendingUsersList = await db.select().from(users).where(eq(users.status, "pending"));
    if (pendingUsersList.length === 0) return [];
    const userIds = pendingUsersList.map(u => u.id);
    const allMemberships = await db.select({
      membership: studioMemberships,
      studioName: studios.name,
    })
      .from(studioMemberships)
      .leftJoin(studios, eq(studios.id, studioMemberships.studioId))
      .where(inArray(studioMemberships.userId, userIds));
    const membershipMap = new Map<string, any[]>();
    for (const row of allMemberships) {
      const uid = row.membership.userId;
      if (!membershipMap.has(uid)) membershipMap.set(uid, []);
      membershipMap.get(uid)!.push({
        membershipId: row.membership.id,
        studioId: row.membership.studioId,
        studioName: row.studioName || "Desconhecido",
        membershipStatus: row.membership.status,
      });
    }
    return pendingUsersList.map(u => ({ ...u, studioMemberships: membershipMap.get(u.id) || [] }));
  }

  async getStudioMemberships(studioId: string): Promise<(StudioMembership & { user?: User })[]> {
    const rows = await db.select({
      membership: studioMemberships,
      user: users,
    })
      .from(studioMemberships)
      .leftJoin(users, eq(users.id, studioMemberships.userId))
      .where(eq(studioMemberships.studioId, studioId))
      .orderBy(desc(studioMemberships.createdAt));
    return rows.map(r => ({ ...r.membership, user: r.user || undefined }));
  }

  async getMembershipsByUser(userId: string): Promise<StudioMembership[]> {
    return await db.select().from(studioMemberships).where(eq(studioMemberships.userId, userId));
  }

  async createMembership(membership: InsertMembership): Promise<StudioMembership> {
    const [created] = await db.insert(studioMemberships).values(membership).returning();
    return created;
  }

  async updateMembershipStatus(id: string, status: string, role?: string): Promise<StudioMembership> {
    const data: any = { status };
    if (role) data.role = role;
    const [updated] = await db.update(studioMemberships).set(data).where(eq(studioMemberships.id, id)).returning();
    return updated;
  }

  async getMembership(id: string): Promise<StudioMembership | undefined> {
    const [membership] = await db.select().from(studioMemberships).where(eq(studioMemberships.id, id));
    return membership;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: db.$count(notifications) })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result?.count ?? 0);
  }

  async getUserStudioRoles(membershipId: string): Promise<UserStudioRole[]> {
    return await db.select().from(userStudioRoles).where(eq(userStudioRoles.membershipId, membershipId));
  }

  async getUserRolesInStudio(userId: string, studioId: string): Promise<string[]> {
    const membership = await db.select()
      .from(studioMemberships)
      .where(and(
        eq(studioMemberships.userId, userId),
        eq(studioMemberships.studioId, studioId),
        eq(studioMemberships.status, "approved")
      ));

    if (membership.length === 0) return [];

    const roles = await db.select({ role: userStudioRoles.role })
      .from(userStudioRoles)
      .where(eq(userStudioRoles.membershipId, membership[0].id));

    if (roles.length > 0) {
      return roles.map(r => r.role);
    }
    return membership[0].role && membership[0].role !== "pending" ? [membership[0].role] : [];
  }

  async addUserStudioRole(membershipId: string, role: string): Promise<UserStudioRole> {
    const [created] = await db.insert(userStudioRoles)
      .values({ membershipId, role })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      const [existing] = await db.select().from(userStudioRoles)
        .where(and(eq(userStudioRoles.membershipId, membershipId), eq(userStudioRoles.role, role)));
      return existing;
    }
    return created;
  }

  async removeUserStudioRole(membershipId: string, role: string): Promise<void> {
    await db.delete(userStudioRoles)
      .where(and(eq(userStudioRoles.membershipId, membershipId), eq(userStudioRoles.role, role)));
  }

  async setUserStudioRoles(membershipId: string, roles: string[]): Promise<UserStudioRole[]> {
    await db.delete(userStudioRoles).where(eq(userStudioRoles.membershipId, membershipId));
    if (roles.length === 0) return [];
    const values = roles.map(role => ({ membershipId, role }));
    return await db.insert(userStudioRoles).values(values).returning();
  }

  async verifyUserStudioAccess(userId: string, studioId: string): Promise<boolean> {
    const [membership] = await db.select({ id: studioMemberships.id })
      .from(studioMemberships)
      .where(and(
        eq(studioMemberships.userId, userId),
        eq(studioMemberships.studioId, studioId),
        eq(studioMemberships.status, "approved")
      ));
    return !!membership;
  }

  async getActiveStudiosPublic(): Promise<{ id: string; name: string }[]> {
    return await db.select({ id: studios.id, name: studios.name })
      .from(studios)
      .where(eq(studios.isActive, true));
  }

  async getStudioStats(studioId: string): Promise<{ members: number; productions: number; sessions: number; takes: number; pendingMembers: number }> {
    const [memberStats] = await db.select({
      approved: sql<number>`count(*) filter (where ${studioMemberships.status} = 'approved')`,
      pending: sql<number>`count(*) filter (where ${studioMemberships.status} = 'pending')`,
    }).from(studioMemberships).where(eq(studioMemberships.studioId, studioId));
    const [prodCount] = await db.select({ count: db.$count(productions) }).from(productions).where(eq(productions.studioId, studioId));
    const [sessCount] = await db.select({ count: db.$count(sessions) }).from(sessions).where(eq(sessions.studioId, studioId));
    const [takeCount] = await db.select({ count: sql<number>`count(${takes.id})` })
      .from(takes)
      .innerJoin(sessions, eq(sessions.id, takes.sessionId))
      .where(eq(sessions.studioId, studioId));
    return {
      members: Number(memberStats?.approved ?? 0),
      productions: Number(prodCount?.count ?? 0),
      sessions: Number(sessCount?.count ?? 0),
      takes: Number(takeCount?.count ?? 0),
      pendingMembers: Number(memberStats?.pending ?? 0),
    };
  }

  async getPendingMembersForStudio(studioId: string): Promise<(StudioMembership & { user?: User })[]> {
    const rows = await db.select({
      membership: studioMemberships,
      user: users,
    })
      .from(studioMemberships)
      .leftJoin(users, eq(users.id, studioMemberships.userId))
      .where(and(eq(studioMemberships.studioId, studioId), eq(studioMemberships.status, "pending")))
      .orderBy(desc(studioMemberships.createdAt));
    return rows.map(r => ({ ...r.membership, user: r.user || undefined }));
  }
}

export const storage = new DatabaseStorage();
