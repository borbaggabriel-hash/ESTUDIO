import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch } from "@studio/lib/auth-fetch";
import { z } from "zod";

export function useStudios() {
  return useQuery({
    queryKey: [api.studios.list.path],
    queryFn: async () => {
      const data = await authFetch(api.studios.list.path);
      return api.studios.list.responses[200].parse(data);
    },
  });
}

export function useStudio(id: string) {
  const { data: studios } = useStudios();
  return studios?.find(s => s.id === id);
}

export function useCreateStudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: z.infer<typeof api.studios.create.input>) => {
      const data = await authFetch(api.studios.create.path, {
        method: api.studios.create.method,
        body: JSON.stringify(input),
      });
      return api.studios.create.responses[201].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.studios.list.path] });
    },
  });
}
