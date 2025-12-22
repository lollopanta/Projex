/**
 * ============================================
 * HOOKS EXPORTS
 * ============================================
 */

// Auth hooks
export {
  authKeys,
  useCurrentUser,
  useLogin,
  useRegister,
  useUpdateProfile,
  useEnable2FA,
  useVerify2FA,
  useDisable2FA,
  useLogout,
} from "./useAuth";

// Projects hooks
export {
  projectKeys,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useRemoveProjectMember,
} from "./useProjects";

// Lists hooks
export {
  listKeys,
  useLists,
  useList,
  useCreateList,
  useUpdateList,
  useDeleteList,
  useAddListMember,
} from "./useLists";

// Tasks hooks
export {
  taskKeys,
  useTasks,
  useInfiniteTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  useAddSubtask,
} from "./useTasks";

// Labels hooks
export {
  labelKeys,
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from "./useLabels";

// Comments hooks
export {
  commentKeys,
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "./useComments";

// Users hooks
export { userKeys, useSearchUsers, useUser } from "./useUsers";

// Admin hooks
export {
  adminKeys,
  useSiteSettings,
  useUpdateSiteSettings,
  useAdminStats,
} from "./useAdmin";
