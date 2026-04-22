import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@studio/lib/auth-fetch";
import { z } from "zod";

export function useSessions(studioId: string) {
  const url = buildUrl(api.sessions.list.path, { studioId });
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const data = await authFetch(url);
      return api.sessions.list.responses[200].parse(data);
    },
    enabled: !!studioId,
  });
}

export function useCreateSession(studioId: string) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.sessions.create.path, { studioId });
  const listUrl = buildUrl(api.sessions.list.path, { studioId });

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.sessions.create.input>) => {
      const data = await authFetch(url, {
        method: api.sessions.create.method,
        body: JSON.stringify(input),
      });
      return api.sessions.create.responses[201].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
    },
  });
}
