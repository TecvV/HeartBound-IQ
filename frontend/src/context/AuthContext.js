import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

axios.defaults.baseURL = process.env.REACT_APP_API_BASE || '' ;

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vowiq_token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else        delete axios.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('vowiq_token');
    if (!token) { setLoading(false); return; }
    axios.get('/api/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => { localStorage.removeItem('vowiq_token'); })
      .finally(() => setLoading(false));
  }, []);

  const signup = async (name, email, password) => {
    const { data } = await axios.post('/api/auth/signup', { name, email, password });
    localStorage.setItem('vowiq_token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('vowiq_token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('vowiq_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateWedding = async (details) => {
    const { data } = await axios.put('/api/auth/wedding', details);
    setUser(data.user);
    return data.user;
  };

  const savePlan    = async (plan) => axios.put('/api/auth/plan',    { plan });
  const saveCard    = async (html) => axios.put('/api/auth/card',    { html });
  const saveWebsite = async (html) => axios.put('/api/auth/website', { html });

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateWedding, savePlan, saveCard, saveWebsite }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


