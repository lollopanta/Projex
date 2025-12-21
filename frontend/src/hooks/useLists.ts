/**
 * ============================================
 * LISTS HOOKS
 * TanStack Query hooks for lists
 * ============================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listsApi } from "@/api";
import { useToast } from "@/store";
import type {
  CreateListRequest,
  UpdateListRequest,
  AddListMemberRequest,
  List,
  ListQueryParams,
} from "@/types";

// Query keys
export const listKeys = {
  all: ["lists"] as const,
  lists: () => [...listKeys.all, "list"] as const,
  list: (filters?: ListQueryParams) => [...listKeys.lists(), filters] as const,
  details: () => [...listKeys.all, "detail"] as const,
  detail: (id: string) => [...listKeys.details(), id] as const,
};

/**
 * Hook to get all lists
 */
export const useLists = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: listKeys.list(params),
    queryFn: () => listsApi.getLists(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to get a single list
 */
export const useList = (id: string) => {
  return useQuery({
    queryKey: listKeys.detail(id),
    queryFn: () => listsApi.getListById(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook to create a list
 */
export const useCreateList = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateListRequest) => listsApi.createList(data),
    onSuccess: (newList) => {
      // Update the lists cache
      queryClient.setQueryData<List[]>(listKeys.lists(), (old) => {
        return old ? [newList, ...old] : [newList];
      });
      // Invalidate to refetch with proper sorting
      queryClient.invalidateQueries({ queryKey: listKeys.lists() });
      toast.success("List created", `"${newList.name}" has been created`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create list", error.message);
    },
  });
};

/**
 * Hook to update a list
 */
export const useUpdateList = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListRequest }) =>
      listsApi.updateList(id, data),
    onSuccess: (updatedList) => {
      queryClient.setQueryData(listKeys.detail(updatedList._id), updatedList);
      queryClient.setQueryData<List[]>(listKeys.lists(), (old) => {
        return old?.map((l) => (l._id === updatedList._id ? updatedList : l));
      });
      toast.success("List updated", "Your changes have been saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to update list", error.message);
    },
  });
};

/**
 * Hook to delete a list
 */
export const useDeleteList = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => listsApi.deleteList(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<List[]>(listKeys.lists(), (old) => {
        return old?.filter((l) => l._id !== id);
      });
      queryClient.removeQueries({ queryKey: listKeys.detail(id) });
      toast.success("List deleted", "The list has been removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete list", error.message);
    },
  });
};

/**
 * Hook to add a member to a list
 */
export const useAddListMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: AddListMemberRequest }) =>
      listsApi.addListMember(listId, data),
    onSuccess: (updatedList) => {
      queryClient.setQueryData(listKeys.detail(updatedList._id), updatedList);
      queryClient.invalidateQueries({ queryKey: listKeys.lists() });
      toast.success("Member added", "The user has been added to the list");
    },
    onError: (error: Error) => {
      toast.error("Failed to add member", error.message);
    },
  });
};
