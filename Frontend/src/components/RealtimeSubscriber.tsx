import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../hooks/useRealtime';

export const RealtimeSubscriber = () => {
  const { token } = useAuth();
  useRealtime(token);
  return null;
};

