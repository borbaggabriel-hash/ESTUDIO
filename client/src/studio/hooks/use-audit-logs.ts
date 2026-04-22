import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch } from "@studio/lib/auth-fetch";

export function useAuditLogs(userId?: string) {
  const url = api.audit.list.path; // I need to make sure this exists in shared/routes.ts
  return useQuery({
    queryKey: [url, userId],
    queryFn: async () => {
      const fullUrl = userId ? `${url}?userId=${userId}` : url;
      const data = await authFetch(fullUrl);
      return data; // Adjust parsing if needed
    },
  });
}
