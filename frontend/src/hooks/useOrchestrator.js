import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export function useOrchestrator() {
  const [plan,       setPlan]       = useState(null);
  const [selections, setSelections] = useState({});
  const [loading,    setLoading]    = useState(false);
  const [checking,   setChecking]   = useState(true);
  const [error,      setError]      = useState(null);
  const [elapsed,    setElapsed]    = useState(null);
  const [hasPlan,    setHasPlan]    = useState(false);

  // Load existing plan on mount
  useEffect(() => {
    axios.get('/api/orchestrate')
      .then(({ data }) => {
        if (data.hasPlan && data.plan) {
          setPlan(data.plan);
          setSelections(data.selections || {});
          setHasPlan(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const run = useCallback(async (brief) => {
    setLoading(true); setError(null); setPlan(null); setHasPlan(false);
    try {
      const { data } = await axios.post('/api/orchestrate', brief);
      setPlan(data);
      setSelections(data.picks || {});
      setElapsed(data.elapsed);
      setHasPlan(true);
      return data;
    } catch (e) {
      setError(e.response?.data?.error || 'Could not generate plan. Is backend running on port 5009');
      return null;
    } finally { setLoading(false); }
  }, []);

  const selectVendor = useCallback(async (category, item) => {
    try {
      const { data } = await axios.put('/api/orchestrate/select', { category, item });
      setSelections(data.selections);
      return data;
    } catch (e) {
      throw new Error(e.response?.data?.error || 'Could not save selection');
    }
  }, []);

  const deletePlan = useCallback(async () => {
    await axios.delete('/api/orchestrate');
    setPlan(null); setSelections({}); setHasPlan(false); setElapsed(null);
  }, []);

  return { plan, selections, loading, checking, error, elapsed, hasPlan, run, selectVendor, deletePlan };
}
