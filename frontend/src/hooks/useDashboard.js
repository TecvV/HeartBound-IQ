import { useState, useCallback } from 'react';
import axios from 'axios';

export function useDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/dashboard');
      setStats(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load dashboard');
    } finally { setLoading(false); }
  }, []);

  const saveInfo = useCallback(async (info) => {
    try { await axios.put('/api/dashboard/info', info); } catch {}
  }, []);

  return { stats, loading, error, load, saveInfo };
}
