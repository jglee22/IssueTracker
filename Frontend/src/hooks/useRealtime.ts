import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface RealtimeEvent {
  type: string;
  payload: any;
}

export const useRealtime = (token: string | null) => {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    const baseURL = api.defaults.baseURL || '';
    const url = `${baseURL.replace(/\/$/, '')}/realtime?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (ev) => {
      if (!ev.data) return;
      try {
        const parsed: RealtimeEvent = JSON.parse(ev.data);
        handleEvent(parsed);
      } catch (error) {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // auto close; EventSource will reconnect by default
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token]);

  const handleEvent = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'notification': {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        break;
      }
      case 'issue_created':
      case 'issue_updated':
      case 'issue_commented': {
        queryClient.invalidateQueries({ queryKey: ['issues'] });
        queryClient.invalidateQueries({ queryKey: ['issue'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
        break;
      }
      case 'project_member_added':
      case 'project_member_role_changed': {
        queryClient.invalidateQueries({ queryKey: ['projectMembers'] });
        break;
      }
      default:
        break;
    }
  };
};

