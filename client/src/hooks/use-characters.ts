import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@/lib/auth-fetch";
import { z } from "zod";

export function useCharacters(productionId: string) {
  const url = buildUrl(api.characters.list.path, { productionId });
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const data = await authFetch(url);
      return api.characters.list.responses[200].parse(data);
    },
    enabled: !!productionId,
  });
}

export function useCreateCharacter(productionId: string) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.characters.create.path, { productionId });
  const listUrl = buildUrl(api.characters.list.path, { productionId });

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.characters.create.input>) => {
      const data = await authFetch(url, {
        method: api.characters.create.method,
        body: JSON.stringify(input),
      });
      return api.characters.create.responses[201].parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
    },
  });
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: z.infer<typeof api.characters.update.input> & { id: string }) => {
      const url = buildUrl(api.characters.update.path, { id });
      const data = await authFetch(url, {
        method: api.characters.update.method,
        body: JSON.stringify(input),
      });
      return api.characters.update.responses[200].parse(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.characters.list.path, { productionId: data.productionId })] });
    },
  });
}
