
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

export const AnalyticsTracker = () => {
  const location = useLocation();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Track general page view
    trackEvent('view', {
      url: window.location.href,
    });
  }, [location, trackEvent]);

  return null;
};
