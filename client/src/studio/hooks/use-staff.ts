import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@studio/lib/auth-fetch";
import { z } from "zod";

export function useStaff(studioId: string) {
  const url = buildUrl(api.staff.list.path, { studioId });
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const data = await authFetch(url);
      return api.staff.list.responses[200].parse(data);
    },
    enabled: !!studioId,
  });
}

export function useCreateStaff(studioId: string) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.staff.create.path, { studioId });
  const listUrl = buildUrl(api.staff.list.path, { studioId });

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.staff.create.input>) => {
      const data = await authFetch(url, {
        method: api.staff.create.method,
        body: JSON.stringify(input),
      });
      return api.staff.create.responses[201].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
    },
  });
}
