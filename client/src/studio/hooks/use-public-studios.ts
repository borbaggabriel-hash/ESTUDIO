import { useQuery } from "@tanstack/react-query";

export interface PublicStudio {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export async function fetchPublicStudios(): Promise<PublicStudio[]> {
  const res = await fetch("/api/auth/studios-public");
  if (!res.ok) {
    throw new Error("Failed to fetch studios");
  }
  return res.json();
}

export function usePublicStudios() {
  return useQuery<PublicStudio[]>({
    queryKey: ["public-studios"],
    queryFn: fetchPublicStudios,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
