import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';

export function useAnalyticsDashboard(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', days],
    queryFn: () => analyticsService.getDashboardStats(days),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
