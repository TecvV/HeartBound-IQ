import { useState, useCallback } from 'react';
import axios from 'axios';

export function useBudget() {
  const [budget,      setBudget]      = useState(null);
  const [summary,     setSummary]     = useState(null);
  const [categories,  setCategories]  = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [sugLoading,  setSugLoading]  = useState(false);
  const [error,       setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/budget');
      setBudget(data.budget);
      setSummary(data.summary);
      setCategories(data.categories || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load budget');
    } finally { setLoading(false); }
  }, []);

  const setTotal = async (totalBudget) => {
    const { data } = await axios.put('/api/budget/total', { totalBudget });
    setBudget(data.budget); setSummary(data.summary);
  };

  const addEntry = async (entry) => {
    const { data } = await axios.post('/api/budget/entries', entry);
    setBudget(data.budget); setSummary(data.summary);
  };

  const updateEntry = async (id, updates) => {
    const { data } = await axios.put(`/api/budget/entries/${id}`, updates);
    setBudget(data.budget); setSummary(data.summary);
  };

  const deleteEntry = async (id) => {
    const { data } = await axios.delete(`/api/budget/entries/${id}`);
    setBudget(data.budget); setSummary(data.summary);
  };

  const loadSuggestions = async () => {
    setSugLoading(true);
    try {
      const { data } = await axios.get('/api/budget/suggestions');
      setSuggestions(data.tips || []);
    } finally { setSugLoading(false); }
  };

  return { budget, summary, categories, suggestions, loading, sugLoading, error, load, setTotal, addEntry, updateEntry, deleteEntry, loadSuggestions };
}
