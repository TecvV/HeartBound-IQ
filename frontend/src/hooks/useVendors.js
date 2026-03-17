import { useState, useCallback } from 'react';
import axios from 'axios';

export function useVendors() {
  const [vendors,    setVendors]    = useState([]);
  const [agentNote,  setAgentNote]  = useState('');
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [selectMsg,  setSelectMsg]  = useState('');
  const [error,      setError]      = useState(null);
  const [hasSearched,setHasSearched]= useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/vendors/categories');
      setCategories(data.categories || []);
    } catch {}
  }, []);

  const search = useCallback(async (brief) => {
    setLoading(true); setError(null); setHasSearched(false);
    try {
      const { data } = await axios.post('/api/vendors/search', brief);
      setVendors(data.vendors || []);
      setAgentNote(data.agentNote || '');
      setHasSearched(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not reach backend.');
    } finally { setLoading(false); }
  }, []);

  const selectVendor = useCallback(async (vendor, budget) => {
    try {
      const { data } = await axios.post('/api/vendors/select', { vendor, budget });
      setSelectMsg(data.message);
      setTimeout(() => setSelectMsg(''), 4000);
    } catch {
      setSelectMsg('Could not log to Budget Tracker.');
    }
  }, []);

  return { vendors, agentNote, categories, loading, selectMsg, error, hasSearched, loadCategories, search, selectVendor };
}
