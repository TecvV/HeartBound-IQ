import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PlanContext = createContext(null);

const EMPTY_CONFIRMED = { venue:false, caterer:false, photographer:false, decorator:false, dj:false };

export function PlanProvider({ children }) {
  const [plan,             setPlan]             = useState(null);
  const [selections,       setSelections]       = useState({});
  const [confirmed,        setConfirmed]        = useState(EMPTY_CONFIRMED);
  const [allConfirmed,     setAllConfirmed]     = useState(false);
  const [hasPlan,          setHasPlan]          = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [wedding,          setWedding]          = useState(null);
  const [websiteUrl,       setWebsiteUrl]       = useState('');
  const [allInvitesSentAt, setAllInvitesSentAt] = useState(null);

  const [cardHtml,         setCardHtml]         = useState('');
  const [cardFinalized,    setCardFinalized]    = useState(false);
  const [cardFinalizedAt,  setCardFinalizedAt]  = useState(null);

  const [pdfHtml,          setPdfHtml]          = useState('');
  const [pdfFinalized,     setPdfFinalized]     = useState(false);
  const [pdfFinalizedAt,   setPdfFinalizedAt]   = useState(null);
  const [pdfDownloadedAt,  setPdfDownloadedAt]  = useState(null);
  const [pdfGeneratedAt,   setPdfGeneratedAt]   = useState(null);

  const [websiteHtml,      setWebsiteHtml]      = useState('');
  const [websiteData,      setWebsiteData]      = useState(null);
  const [websiteFinalized, setWebsiteFinalized] = useState(false);
  const [websiteFinalizedAt, setWebsiteFinalizedAt] = useState(null);
  const [websiteGeneratedAt, setWebsiteGeneratedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/orchestrate');
      if (data.hasPlan && data.plan) {
        setPlan(data.plan);
        setSelections(data.selections || {});
        setHasPlan(true);
        setWedding(data.wedding);
        setConfirmed(data.confirmed || EMPTY_CONFIRMED);
        setAllConfirmed(!!data.allConfirmed);
        setWebsiteUrl(data.websiteUrl || '');
        setAllInvitesSentAt(data.allInvitesSentAt || null);
        setCardHtml(data.cardHtml || '');
        setCardFinalized(!!data.cardFinalized);
        setCardFinalizedAt(data.cardFinalizedAt || null);
        setPdfHtml(data.pdfHtml || '');
        setPdfFinalized(!!data.pdfFinalized);
        setPdfFinalizedAt(data.pdfFinalizedAt || null);
        setPdfDownloadedAt(data.pdfDownloadedAt || null);
        setPdfGeneratedAt(data.pdfGeneratedAt || null);
        setWebsiteHtml(data.websiteHtml || '');
        setWebsiteData(data.websiteData || null);
        setWebsiteFinalized(!!data.websiteFinalized);
        setWebsiteFinalizedAt(data.websiteFinalizedAt || null);
        setWebsiteGeneratedAt(data.websiteGeneratedAt || null);
      } else {
        setPlan(null); setSelections({}); setHasPlan(false);
        setConfirmed(EMPTY_CONFIRMED); setAllConfirmed(false);
        setWebsiteUrl(''); setAllInvitesSentAt(null);
        setCardHtml(''); setCardFinalized(false); setCardFinalizedAt(null);
        setPdfHtml(''); setPdfFinalized(false); setPdfFinalizedAt(null); setPdfDownloadedAt(null); setPdfGeneratedAt(null);
        setWebsiteHtml(''); setWebsiteData(null); setWebsiteFinalized(false); setWebsiteFinalizedAt(null); setWebsiteGeneratedAt(null);
        setWedding(data.wedding);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateSelection = (category, item) =>
    setSelections(prev => ({ ...prev, [category]: item }));

  const setConfirmedCategory = (category, value) => {
    setConfirmed(prev => {
      const next = { ...prev, [category]: value };
      setAllConfirmed(Object.values(next).every(Boolean));
      return next;
    });
  };

  const clearPlan = () => {
    setPlan(null); setSelections({}); setHasPlan(false);
    setConfirmed(EMPTY_CONFIRMED); setAllConfirmed(false);
    setWebsiteUrl(''); setAllInvitesSentAt(null);
    setCardHtml(''); setCardFinalized(false); setCardFinalizedAt(null);
    setPdfHtml(''); setPdfFinalized(false); setPdfFinalizedAt(null); setPdfDownloadedAt(null); setPdfGeneratedAt(null);
    setWebsiteHtml(''); setWebsiteData(null); setWebsiteFinalized(false); setWebsiteFinalizedAt(null); setWebsiteGeneratedAt(null);
  };

  return (
    <PlanContext.Provider value={{
      plan, selections, confirmed, allConfirmed,
      hasPlan, loading, wedding, websiteUrl, allInvitesSentAt,
      cardHtml, cardFinalized, cardFinalizedAt,
      pdfHtml, pdfFinalized, pdfFinalizedAt, pdfDownloadedAt, pdfGeneratedAt,
      websiteHtml, websiteData, websiteFinalized, websiteFinalizedAt, websiteGeneratedAt,
      refresh, updateSelection, setConfirmedCategory, clearPlan,
      setWebsiteUrl, setAllInvitesSentAt,
      setCardHtml, setCardFinalized, setCardFinalizedAt,
      setPdfHtml, setPdfFinalized, setPdfFinalizedAt, setPdfDownloadedAt, setPdfGeneratedAt,
      setWebsiteHtml, setWebsiteData, setWebsiteFinalized, setWebsiteFinalizedAt, setWebsiteGeneratedAt,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
