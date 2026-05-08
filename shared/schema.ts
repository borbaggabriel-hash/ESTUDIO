export * from "./models/auth";

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
}, (table) => {
  return {
    userIdIdx: index("user_roles_user_id_idx").on(table.userId),
  };
});

export const studios = pgTable("studios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tradeName: text("trade_name"),
  cnpj: text("cnpj"),
  legalRepresentative: text("legal_representative"),
  email: text("email"),
  phone: text("phone"),
  altPhone: text("alt_phone"),
  street: text("street"),
  addressNumber: text("address_number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  recordingRooms: integer("recording_rooms"),
  studioType: text("studio_type"),
  website: text("website"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  description: text("description"),
  foundedYear: integer("founded_year"),
  employeeCount: integer("employee_count"),
  logoUrl: text("logo_url"),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").default(true),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    slugIdx: index("studios_slug_idx").on(table.slug),
    ownerIdIdx: index("studios_owner_id_idx").on(table.ownerId),
  };
});

export const studioProfiles = pgTable("studio_profiles", {
  studioId: varchar("studio_id")
    .primaryKey()
    .references(() => studios.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    studioIdIdx: index("studio_profiles_studio_id_idx").on(table.studioId),
  };
});

export const studioMemberships = pgTable("studio_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  studioId: varchar("studio_id").notNull().references(() => studios.id),
  role: text("role").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("studio_memberships_user_id_idx").on(table.userId),
    studioIdIdx: index("studio_memberships_studio_id_idx").on(table.studioId),
  };
});

export const userStudioRoles = pgTable("user_studio_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  membershipId: varchar("membership_id").notNull().references(() => studioMemberships.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
}, (table) => {
  return {
    membershipIdIdx: index("user_studio_roles_membership_id_idx").on(table.membershipId),
    uniqueMembershipRole: uniqueIndex("user_studio_roles_membership_role_idx").on(table.membershipId, table.role),
  };
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: text("related_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
  };
});

export const productions = pgTable("productions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studioId: varchar("studio_id").notNull().references(() => studios.id),
  name: text("name").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  scriptJson: text("script_json"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    studioIdIdx: index("productions_studio_id_idx").on(table.studioId),
    isPublicIdx: index("productions_is_public_idx").on(table.isPublic),
  };
});

export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productionId: varchar("production_id").notNull().references(() => productions.id),
  name: text("name").notNull(),
  voiceActorId: varchar("voice_actor_id").references(() => users.id),
}, (table) => {
  return {
    productionIdIdx: index("characters_production_id_idx").on(table.productionId),
  };
});

export const sessions = pgTable("recording_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productionId: varchar("production_id").notNull().references(() => productions.id),
  studioId: varchar("studio_id").notNull().references(() => studios.id),
  title: text("title").notNull().default("Untitled Session"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: text("status").notNull().default("scheduled"),
  storageProvider: text("storage_provider").notNull().default("supabase"),
  takesPath: text("takes_path").notNull().default("uploads"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    productionIdIdx: index("rec_sessions_production_id_idx").on(table.productionId),
    studioIdIdx: index("rec_sessions_studio_id_idx").on(table.studioId),
  };
});

export const sessionParticipants = pgTable("session_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
}, (table) => {
  return {
    sessionIdIdx: index("session_participants_session_id_idx").on(table.sessionId),
    userIdIdx: index("session_participants_user_id_idx").on(table.userId),
  };
});

export const takes = pgTable("takes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id),
  characterId: varchar("character_id").notNull().references(() => characters.id),
  voiceActorId: varchar("voice_actor_id").notNull().references(() => users.id),
  lineIndex: integer("line_index").notNull(),
  audioUrl: text("audio_url").notNull(),
  durationSeconds: real("duration_seconds").notNull(),
  
  // Review workflow fields
  status: text("status").notNull().default("pending"),
  directorFeedback: text("director_feedback"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  takeNumber: integer("take_number").notNull().default(1),
  isFinal: boolean("is_final").default(false),
  
  // Timecode / offset
  startTimeSeconds: real("start_time_seconds").default(0),

  // Existing fields
  isPreferred: boolean("is_preferred").default(false),
  qualityScore: real("quality_score"),
  aiRecommended: boolean("ai_recommended").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  voiceActorName: text("voice_actor_name"),
}, (table) => {
  return {
    sessionIdIdx: index("takes_session_id_idx").on(table.sessionId),
    characterIdIdx: index("takes_character_id_idx").on(table.characterId),
    voiceActorIdIdx: index("takes_voice_actor_id_idx").on(table.voiceActorId),
    statusIdx: index("takes_status_idx").on(table.status),
    reviewedByIdx: index("takes_reviewed_by_idx").on(table.reviewedBy),
  };
});

export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("audit_log_user_id_idx").on(table.userId),
  };
});

export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studioId: varchar("studio_id").notNull().references(() => studios.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });
export const insertStudioSchema = createInsertSchema(studios).omit({ id: true, createdAt: true });
export const insertStudioMembershipSchema = createInsertSchema(studioMemberships).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertProductionSchema = createInsertSchema(productions).omit({ id: true, createdAt: true });
export const insertCharacterSchema = createInsertSchema(characters).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true });
export const insertSessionParticipantSchema = createInsertSchema(sessionParticipants).omit({ id: true });
export const insertTakeSchema = createInsertSchema(takes).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export const insertUserStudioRoleSchema = createInsertSchema(userStudioRoles).omit({ id: true });
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, updatedAt: true });

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type Studio = typeof studios.$inferSelect;
export type TakeStatus = 'pending' | 'approved' | 'rejected' | 'superseded';
export type Take = typeof takes.$inferSelect;
export type TakeWithDetails = Take & { characterName?: string | null; voiceActorName?: string | null; sessionTitle?: string; productionId?: string; productionName?: string; studioId?: string; studioName?: string };
export type StudioProfile = typeof studioProfiles.$inferSelect;
export type StudioMembership = typeof studioMemberships.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Production = typeof productions.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type UserStudioRole = typeof userStudioRoles.$inferSelect;

// ── THE HUB (SECRETARIA) ─────────────────────────────────────────────────────

export const hubBanners = pgTable("hub_banners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title"),
  subtitle: text("subtitle"),
  description: text("description"),
  imageUrl: text("image_url"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
});

export const hubModules = pgTable("hub_modules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  num: text("num"),
  slug: text("slug"),
  title: text("title"),
  teacher: text("teacher"),
  duration: text("duration"),
  desc: text("desc"),
  icon: text("icon"),
  details: jsonb("details"),
});

export const hubTeachers = pgTable("hub_teachers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name"),
  role: text("role"),
  photo: text("photo"),
  bio: text("bio"),
  specialties: jsonb("specialties"),
});

export const hubLearnings = pgTable("hub_learnings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title"),
  description: text("description"),
  moduleSlug: text("module_slug"),
});

export const hubTestimonials = pgTable("hub_testimonials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name"),
  role: text("role"),
  text: text("text"),
  avatar: text("avatar"),
});

export const hubFaqs = pgTable("hub_faqs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question"),
  answer: text("answer"),
});

export const hubSettings = pgTable("hub_settings", {
  id: text("id").primaryKey().default("global"),
  data: jsonb("data").notNull().default({}),
});

export const hubEnrollments = pgTable("hub_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email"),
  name: text("name"),
  phone: text("phone"),
  module: text("module"),
  moduleSlug: text("module_slug"),
  status: text("status").default("Pendente"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentProfiles = pgTable("student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  role: text("role").default("student"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  plan: text("plan"),
  status: text("status").default("Ativo"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentEnrollments = pgTable("student_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }),
  module: text("module"),
  moduleSlug: text("module_slug"),
  status: text("status").default("Ativo"),
  progress: integer("progress").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentMessages = pgTable("student_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentInvoices = pgTable("student_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }),
  description: text("description"),
  amount: text("amount"),
  dueDate: text("due_date"),
  status: text("status").default("Pendente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentSupport = pgTable("student_support", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject"),
  message: text("message"),
  email: text("email"),
  name: text("name"),
  status: text("status").default("Aberto"),
  adminReply: text("admin_reply").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const studentAgenda = pgTable("student_agenda", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  date: text("date"),
  time: text("time"),
  description: text("description"),
  type: text("type").default("Aula"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentActivity = pgTable("student_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Hub types ──────────────────────────────────────────────────────────────────
export type HubEnrollment = typeof hubEnrollments.$inferSelect;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type StudentMessage = typeof studentMessages.$inferSelect;
export type StudentInvoice = typeof studentInvoices.$inferSelect;
export type StudentSupport = typeof studentSupport.$inferSelect;
export type StudentAgenda = typeof studentAgenda.$inferSelect;
