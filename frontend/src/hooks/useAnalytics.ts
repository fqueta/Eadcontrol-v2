import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/qlib';
import axios from 'axios';

export const useAnalytics = () => {
  const { user } = useAuth(); // Assuming auth context provides user info

  const trackEvent = useCallback(async (
    eventType: 'view' | 'whatsapp_contact',
    data: {
      url?: string;
      resource_type?: string;
      resource_id?: number;
      metadata?: any;
      phone?: string;
    } = {}
  ) => {
    try {
      const payload = {
        event_type: eventType,
        url: data.url || window.location.href,
        user_id: user?.id, // Optional depending on backend requirement
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        metadata: data.metadata,
        phone: data.phone,
      };

      const token = localStorage.getItem('token'); 
      const apiUrl = getApiUrl();

      await axios.post(`${apiUrl}/tracking`, payload, {
          headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });
      
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [user]);

  return { trackEvent };
};
