import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@studio/lib/auth-fetch";
import { z } from "zod";

export function useProductions(studioId: string) {
  const url = buildUrl(api.productions.list.path, { studioId });
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const data = await authFetch(url);
      return api.productions.list.responses[200].parse(data);
    },
    enabled: !!studioId,
  });
}

export function usePublicProductions() {
  return useQuery({
    queryKey: ["/api/productions/public"],
    queryFn: () => authFetch("/api/productions/public"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduction(studioId: string, id: string) {
  const url = buildUrl(api.productions.get.path, { studioId, id });
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const data = await authFetch(url);
      return api.productions.get.responses[200].parse(data);
    },
    enabled: !!studioId && !!id,
  });
}

export function useCreateProduction(studioId: string) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.productions.create.path, { studioId });
  const listUrl = buildUrl(api.productions.list.path, { studioId });

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.productions.create.input>) => {
      const data = await authFetch(url, {
        method: api.productions.create.method,
        body: JSON.stringify(input),
      });
      return api.productions.create.responses[201].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
    },
  });
}

export function useUpdateProduction(studioId: string, id: string) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.productions.update.path, { studioId, id });
  const listUrl = buildUrl(api.productions.list.path, { studioId });
  const getUrl = buildUrl(api.productions.get.path, { studioId, id });

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.productions.update.input>) => {
      const data = await authFetch(url, {
        method: api.productions.update.method,
        body: JSON.stringify(input),
      });
      return api.productions.update.responses[200].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      queryClient.invalidateQueries({ queryKey: [getUrl] });
    },
  });
}
