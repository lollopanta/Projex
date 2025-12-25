/**
 * ============================================
 * PROJEX TYPE DEFINITIONS
 * Matching Backend API Models
 * ============================================
 */

// ============================================
// Base Types
// ============================================

export type ObjectId = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// ============================================
// User Types
// ============================================

export type UserRole = "user" | "admin";
export type Theme = "light" | "dark";

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  defaultReminderTime: number; // hours before deadline
}

export interface User extends Timestamps {
  _id: ObjectId;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  twoFactorMethod?: "totp" | "email";
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  theme: Theme;
  preferences: UserPreferences;
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
}

export interface UserPublic {
  _id: ObjectId;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

// ============================================
// Project Types
// ============================================

export type MemberRole = "viewer" | "editor" | "admin";

export interface ProjectMember {
  user: UserPublic | ObjectId;
  role: MemberRole;
  addedAt: string;
}

export interface KanbanColumn {
  _id: ObjectId;
  name: string;
  color: string;
  position: number;
  createdAt: string;
}

export interface Project extends Timestamps {
  _id: ObjectId;
  name: string;
  description?: string;
  owner: UserPublic | ObjectId;
  members: ProjectMember[];
  color: string;
  kanbanColumns?: KanbanColumn[];
  isArchived: boolean;
}

export interface ProjectWithStats extends Project {
  stats: {
    tasks: number;
    completedTasks: number;
    lists: number;
  };
}

// ============================================
// List Types
// ============================================

export interface ListMember {
  user: UserPublic | ObjectId;
  role: MemberRole;
  addedAt: string;
}

export interface List extends Timestamps {
  _id: ObjectId;
  name: string;
  description?: string;
  owner: UserPublic | ObjectId;
  project?: Project | ObjectId | null;
  members: ListMember[];
  color: string;
  position: number;
  isArchived: boolean;
}

export interface ListWithStats extends List {
  stats: {
    tasks: number;
    completedTasks: number;
  };
}

// ============================================
// Task Types
// ============================================

export type Priority = "low" | "medium" | "high";
export type ReminderType = "email" | "push";
export type RecurringPatternType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface Reminder {
  type: ReminderType;
  timeBefore: number; // hours before deadline
  sent: boolean;
  sentAt?: string;
}

export interface Subtask {
  _id?: ObjectId;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  position: number;
}

export interface RecurringPattern {
  type: RecurringPatternType;
  interval: number;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  endDate?: string;
  nextDueDate?: string;
}

export interface Attachment {
  filename: string;
  path: string;
  uploadedAt: string;
}

export interface Task extends Timestamps {
  _id: ObjectId;
  title: string;
  description?: string;
  list: List | ObjectId;
  project?: Project | ObjectId | null;
  kanbanColumnId?: ObjectId | null;
  createdBy: UserPublic | ObjectId;
  assignedTo: (UserPublic | ObjectId)[];
  priority: Priority;
  labels: (Label | ObjectId)[];
  dueDate?: string | null;
  reminders: Reminder[];
  completed: boolean;
  completedAt?: string | null;
  subtasks: Subtask[];
  position: number;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern | null;
  parentTask?: Task | ObjectId | null;
  dependencies?: (Task | ObjectId)[]; // Tasks this task depends on
  attachments: Attachment[];
  googleCalendarEventId?: string | null;
  isBlocked?: boolean; // Computed field: true if any dependency is incomplete
}

export interface TaskPopulated extends Omit<Task, "list" | "project" | "createdBy" | "assignedTo" | "labels" | "parentTask" | "dependencies"> {
  list: Pick<List, "_id" | "name" | "color">;
  project?: Pick<Project, "_id" | "name" | "color"> | null;
  createdBy: UserPublic;
  assignedTo: UserPublic[];
  labels: Label[];
  parentTask?: Pick<Task, "_id" | "title"> | null;
  dependencies?: (TaskDependency | ObjectId)[]; // Populated dependencies or IDs
}

export interface TaskDependency {
  _id: ObjectId;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string | null;
}

export interface DependencyGraphNode {
  task: TaskPopulated;
  depth: number;
}

export interface DependencyGraph {
  task: TaskPopulated;
  upstream: DependencyGraphNode[]; // Tasks this task depends on (dependencies)
  downstream: DependencyGraphNode[]; // Tasks that depend on this task (dependents)
  isBlocked: boolean;
}

export interface ImpactAnalysis {
  task: {
    _id: ObjectId;
    title: string;
    completed: boolean;
  };
  direct: number;
  indirect: number;
  total: number;
  impactedTasks: Array<{
    _id: ObjectId;
    title: string;
    completed: boolean;
    priority: Priority;
    dueDate?: string | null;
    list: Pick<List, "_id" | "name" | "color">;
    project?: Pick<Project, "_id" | "name" | "color"> | null;
    isDirect: boolean;
  }>;
}

// ============================================
// Label Types
// ============================================

export interface Label {
  _id: ObjectId;
  name: string;
  color: string;
  createdBy: ObjectId;
  createdAt: string;
}

// ============================================
// Comment Types
// ============================================

export interface Comment {
  _id: ObjectId;
  task: ObjectId;
  user: UserPublic;
  content: string;
  attachments: Attachment[];
  editedAt?: string | null;
  createdAt: string;
}

// ============================================
// API Request Types
// ============================================

// Auth
export interface LoginRequest {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  theme?: Theme;
  preferences?: Partial<UserPreferences>;
}

// Projects
export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface AddProjectMemberRequest {
  userId: ObjectId;
  role: MemberRole;
}

// Lists
export interface CreateListRequest {
  name: string;
  description?: string;
  project?: ObjectId;
  color?: string;
}

export interface UpdateListRequest {
  name?: string;
  description?: string;
  color?: string;
  position?: number;
}

export interface AddListMemberRequest {
  userId: ObjectId;
  role: MemberRole;
}

// Tasks
export interface CreateTaskRequest {
  title: string;
  description?: string;
  list: ObjectId;
  project?: ObjectId;
  assignedTo?: ObjectId[];
  priority?: Priority;
  labels?: ObjectId[];
  dueDate?: string;
  reminders?: Omit<Reminder, "sent" | "sentAt">[];
  subtasks?: Omit<Subtask, "_id" | "completed" | "completedAt" | "position">[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  dependencies?: ObjectId[]; // Tasks this task depends on
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  list?: ObjectId;
  project?: ObjectId;
  kanbanColumnId?: ObjectId | null;
  assignedTo?: ObjectId[];
  priority?: Priority;
  labels?: ObjectId[];
  dueDate?: string | null;
  reminders?: Reminder[];
  completed?: boolean;
  subtasks?: Subtask[];
  position?: number;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern | null;
  dependencies?: ObjectId[]; // Tasks this task depends on
}

export interface CreateSubtaskRequest {
  title: string;
  description?: string;
}

// Labels
export interface CreateLabelRequest {
  name: string;
  color?: string;
}

export interface UpdateLabelRequest {
  name?: string;
  color?: string;
}

// Comments
export interface CreateCommentRequest {
  task: ObjectId;
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// Backup
export interface BackupData {
  version: string;
  exportedAt: string;
  user: {
    id: ObjectId;
    username: string;
    email: string;
  };
  data: {
    tasks: Task[];
    projects: Project[];
    lists: List[];
    labels: Label[];
    comments: Comment[];
  };
}

export interface ImportBackupRequest {
  data: Partial<BackupData["data"]>;
}

// ============================================
// API Response Types
// ============================================

export interface AuthResponse {
  message: string;
  token: string;
  requiresEmailVerification?: boolean;
  user: {
    id: ObjectId;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    theme: Theme;
    role?: UserRole;
    twoFactorEnabled?: boolean;
    twoFactorMethod?: "totp" | "email";
    emailVerified?: boolean;
  };
}

export interface TwoFactorSetupResponse {
  message: string;
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export interface PaginatedResponse<T> {
  tasks: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MessageResponse {
  message: string;
}

export interface ValidationError {
  type: string;
  msg: string;
  path: string;
  location: string;
}

export interface ErrorResponse {
  message: string;
  error?: string;
  errors?: ValidationError[];
}

// ============================================
// Query Parameter Types
// ============================================

export interface TaskQueryParams {
  listId?: ObjectId;
  projectId?: ObjectId;
  assignedTo?: ObjectId | "me";
  priority?: Priority;
  label?: ObjectId;
  dueDate?: string;
  completed?: boolean;
  search?: string;
  sortBy?: "createdAt" | "dueDate" | "priority" | "title" | "position";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListQueryParams {
  projectId?: ObjectId;
}

// ============================================
// UI State Types
// ============================================

export interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
}

export interface ModalState {
  isOpen: boolean;
  type: "task" | "project" | "list" | "label" | "confirm" | "search" | null;
  data?: unknown;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
}

// ============================================
// Site Settings Types
// ============================================

export interface SiteSettings {
  _id: ObjectId;
  allowEmailSending: boolean;
  requireEmailVerification: boolean;
  allowEmail2FA: boolean;
  allowTOTP2FA: boolean;
  defaultTheme: Theme;
  registrationEnabled: boolean;
  maxProjectsPerUser: number | null;
  maxTasksPerProject: number | null;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  emailVerificationCooldown: number;
  email2FACooldown: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  users: {
    total: number;
    verified: number;
    admins: number;
    with2FA: number;
  };
}

// Kanban Columns
export interface CreateKanbanColumnRequest {
  name: string;
  color?: string;
  position?: number;
}

export interface UpdateKanbanColumnRequest {
  name?: string;
  color?: string;
  position?: number;
}

export interface UpdateSiteSettingsRequest {
  allowEmailSending?: boolean;
  requireEmailVerification?: boolean;
  allowEmail2FA?: boolean;
  allowTOTP2FA?: boolean;
  defaultTheme?: Theme;
  registrationEnabled?: boolean;
  maxProjectsPerUser?: number | null;
  maxTasksPerProject?: number | null;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  emailVerificationCooldown?: number;
  email2FACooldown?: number;
}
