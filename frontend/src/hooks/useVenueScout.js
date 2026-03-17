import { useState } from 'react';
import axios from 'axios';

export function useVenueScout() {
  const [venues, setVenues]       = useState([]);
  const [agentNote, setAgentNote] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const scout = async (brief) => {
    setLoading(true);
    setError(null);
    setHasSearched(false);

    try {
      const { data } = await axios.post('/api/venues/scout', brief);
      setVenues(data.venues || []);
      setAgentNote(data.agentNote || '');
      setHasSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to connect. Is the backend running');
    } finally {
      setLoading(false);
    }
  };

  return { venues, agentNote, loading, error, hasSearched, scout };
}
