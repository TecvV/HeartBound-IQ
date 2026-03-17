import { useState, useCallback } from 'react';
import axios from 'axios';

export function useTimeline() {
  const [events,    setEvents]    = useState([]);
  const [tips,      setTips]      = useState([]);
  const [agentNote, setAgentNote] = useState('');
  const [meta,      setMeta]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [generated, setGenerated] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/timeline');
      if (data.timeline) {
        setEvents(data.timeline.events || []);
        setTips(data.timeline.tips || []);
        setMeta({ brideName: data.timeline.brideName, groomName: data.timeline.groomName, weddingDate: data.timeline.weddingDate });
        setGenerated(true);
      }
    } catch {}
  }, []);

  const generate = useCallback(async (brief) => {
    setLoading(true); setError(null);
    try {
      const { data } = await axios.post('/api/timeline/generate', brief);
      setEvents(data.events || []);
      setTips(data.tips || []);
      setAgentNote(data.agentNote || '');
      setMeta({ brideName: brief.brideName, groomName: brief.groomName, weddingDate: brief.weddingDate });
      setGenerated(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not reach backend.');
    } finally { setLoading(false); }
  }, []);

  const toggleComplete = useCallback(async (id, completed) => {
    setEvents(ev => ev.map(e => e.id === id ? { ...e, completed } : e));
    try { await axios.patch(`/api/timeline/events/${id}/complete`, { completed }); } catch {}
  }, []);

  return { events, tips, agentNote, meta, loading, error, generated, load, generate, toggleComplete };
}
