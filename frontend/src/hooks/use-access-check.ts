import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/authService';

interface UseAccessCheckParams {
  permission?: string;
  path?: string;
  enabled?: boolean;
}

export function useAccessCheck({ permission, path, enabled = true }: UseAccessCheckParams) {
  return useQuery({
    queryKey: ['access', permission, path],
    queryFn: () => authService.checkAccess({ permission, path }),
    enabled: enabled && (!!permission || !!path),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes  
    retry: 1,
    refetchOnWindowFocus: false,
  });
}