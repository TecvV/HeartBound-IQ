import { useState, useCallback } from 'react';
import axios from 'axios';

export function useGuests() {
  const [guests, setGuests]   = useState([]);
  const [stats,  setStats]    = useState({ total:0, confirmed:0, declined:0, pending:0, invited:0 });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/guests');
      setGuests(data.guests || []);
      setStats(data.stats  || {});
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load guests');
    } finally { setLoading(false); }
  }, []);

  const addGuest = async (form) => {
    const { data } = await axios.post('/api/guests', form);
    setGuests((g) => [data.guest, ...g]);
    setStats((s) => ({ ...s, total: s.total + 1, pending: s.pending + 1 }));
    return data.guest;
  };

  const updateGuest = async (id, updates) => {
    const { data } = await axios.put(`/api/guests/${id}`, updates);
    setGuests((g) => g.map((x) => (x._id === id ? data.guest : x)));
    return data.guest;
  };

  const deleteGuest = async (id) => {
    await axios.delete(`/api/guests/${id}`);
    setGuests((g) => g.filter((x) => x._id !== id));
    setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
  };

  const previewCard = async (weddingDetails) => {
    const { data } = await axios.post('/api/guests/card/preview', weddingDetails);
    return data.html;
  };

  const sendAll = async (weddingDetails) => {
    const { data } = await axios.post('/api/guests/invite/all', weddingDetails);
    await load();
    return data;
  };

  return { guests, stats, loading, error, load, addGuest, updateGuest, deleteGuest, previewCard, sendAll };
}
