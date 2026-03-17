import { useState, useCallback } from 'react';
import axios from 'axios';

export function useCatering() {
  const [caterers,   setCaterers]   = useState([]);
  const [agentNote,  setAgentNote]  = useState('');
  const [menu,       setMenu]       = useState(null);
  const [menuCuisine,setMenuCuisine]= useState('');
  const [loading,    setLoading]    = useState(false);
  const [menuLoading,setMenuLoading]= useState(false);
  const [selectMsg,  setSelectMsg]  = useState('');
  const [error,      setError]      = useState(null);
  const [hasSearched,setHasSearched]= useState(false);

  const search = useCallback(async (brief) => {
    setLoading(true); setError(null); setHasSearched(false);
    try {
      const { data } = await axios.post('/api/catering/search', brief);
      setCaterers(data.caterers || []);
      setAgentNote(data.agentNote || '');
      setHasSearched(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not reach backend. Is it running');
    } finally { setLoading(false); }
  }, []);

  const generateMenu = useCallback(async (cuisine, guestCount, preferences) => {
    setMenuLoading(true);
    try {
      const { data } = await axios.post('/api/catering/menu', { cuisine, guestCount, preferences });
      setMenu(data.menu);
      setMenuCuisine(data.cuisine);
    } finally { setMenuLoading(false); }
  }, []);

  const selectCaterer = useCallback(async (caterer, guestCount) => {
    try {
      const { data } = await axios.post('/api/catering/select', { caterer, guestCount });
      setSelectMsg(data.message);
      setTimeout(() => setSelectMsg(''), 4000);
    } catch (e) {
      setSelectMsg('Could not log to budget tracker.');
    }
  }, []);

  return { caterers, agentNote, menu, menuCuisine, loading, menuLoading, selectMsg, error, hasSearched, search, generateMenu, selectCaterer };
}
