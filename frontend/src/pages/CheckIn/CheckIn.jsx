import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle, XCircle, AlertCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';

// html5-qrcode is loaded dynamically to avoid SSR issues
let Html5QrcodeScanner;

const RESULT_STATES = {
  success:    { icon: CheckCircle,  color: 'emerald', label: 'Checked In' },
  duplicate:  { icon: AlertCircle, color: 'amber',   label: 'Already Checked In' },
  error:      { icon: XCircle,     color: 'red',     label: 'Invalid Ticket' },
};

const CheckIn = () => {
  const [events, setEvents]           = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [scannerReady, setScannerReady]       = useState(false);
  const [scanning, setScanning]               = useState(false);
  const [processing, setProcessing]           = useState(false);
  const [result, setResult]                   = useState(null); // { state, ticket, message }
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);

  // Fetch organizer's events for the selector
  useEffect(() => {
    client.get('/api/events/organizer')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEvents(list);
        if (list.length === 1) setSelectedEventId(list[0]._id);
      })
      .catch(() => toast.error('Could not load your events.', { id: 'checkin-events' }));
  }, []);

  // Load html5-qrcode dynamically
  useEffect(() => {
    import('html5-qrcode').then((mod) => {
      Html5QrcodeScanner = mod.Html5QrcodeScanner;
      setScannerReady(true);
    });
  }, []);

  const handleScanSuccess = useCallback(async (decodedText) => {
    if (processing) return;
    setProcessing(true);

    // Stop scanner while processing to avoid double-scans
    if (instanceRef.current) {
      try { await instanceRef.current.pause(); } catch (_) {}
    }

    let ticketId = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      ticketId = parsed.id || decodedText;
    } catch (_) {
      // raw string ticketId — use as-is
    }

    try {
      const res = await client.patch(`/api/tickets/${ticketId}/checkin`);
      const data = res.data;
      setResult({
        state: data.alreadyCheckedIn ? 'duplicate' : 'success',
        ticket: data.ticket,
        checkedInAt: data.checkedInAt,
      });
    } catch (err) {
      setResult({
        state: 'error',
        message: err.response?.data?.message || 'Ticket not found or invalid',
      });
    } finally {
      // Auto-resume scanner after 3 s
      setTimeout(async () => {
        setResult(null);
        setProcessing(false);
        if (instanceRef.current) {
          try { await instanceRef.current.resume(); } catch (_) {}
        }
      }, 3000);
    }
  }, [processing]);

  const startScanner = useCallback(() => {
    if (!Html5QrcodeScanner || !scannerRef.current) return;
    if (instanceRef.current) return; // already started

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
      false
    );
    scanner.render(handleScanSuccess, () => {});
    instanceRef.current = scanner;
    setScanning(true);
  }, [handleScanSuccess]);

  const stopScanner = useCallback(async () => {
    if (instanceRef.current) {
      try { await instanceRef.current.clear(); } catch (_) {}
      instanceRef.current = null;
    }
    setScanning(false);
    setResult(null);
    setProcessing(false);
  }, []);

  // Clean up on unmount
  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const cfg = result ? RESULT_STATES[result.state] : null;

  return (
    <div className="min-h-screen bg-slate-950 pt-10 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Ticket Check-In</h1>
          <p className="text-slate-400 text-sm">Scan attendee QR codes to validate entry.</p>
        </div>

        {/* Event selector */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => { setSelectedEventId(e.target.value); stopScanner(); }}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm appearance-none"
          >
            <option value="">— Choose an event —</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title} · {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        {/* Scanner card */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-violet-400" />
              QR Scanner
            </h2>
            {scanning ? (
              <button
                onClick={stopScanner}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Stop Scanner
              </button>
            ) : (
              <button
                onClick={startScanner}
                disabled={!selectedEventId || !scannerReady}
                className="flex items-center gap-2 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors font-semibold"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Scanner
              </button>
            )}
          </div>

          {/* Viewfinder */}
          <div className="relative">
            {/* html5-qrcode mounts here */}
            <div
              id="qr-reader"
              ref={scannerRef}
              className={`rounded-xl overflow-hidden ${scanning ? 'block' : 'hidden'}`}
            />

            {/* Placeholder when not scanning */}
            {!scanning && (
              <div className="h-56 bg-slate-950/50 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3">
                <ScanLine className="w-12 h-12 text-slate-700" />
                <p className="text-slate-500 text-sm">
                  {!selectedEventId
                    ? 'Select an event above to begin'
                    : 'Press Start Scanner to activate camera'}
                </p>
              </div>
            )}

            {/* Result overlay */}
            <AnimatePresence>
              {result && cfg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-950/95 border-2 ${
                    result.state === 'success'   ? 'border-emerald-500/50' :
                    result.state === 'duplicate' ? 'border-amber-500/50'   :
                                                   'border-red-500/50'
                  }`}
                >
                  <cfg.icon
                    className={`w-14 h-14 ${
                      result.state === 'success'   ? 'text-emerald-400' :
                      result.state === 'duplicate' ? 'text-amber-400'   :
                                                     'text-red-400'
                    }`}
                  />
                  <div className="text-center px-4">
                    <p className={`text-xl font-bold ${
                      result.state === 'success'   ? 'text-emerald-400' :
                      result.state === 'duplicate' ? 'text-amber-400'   :
                                                     'text-red-400'
                    }`}>
                      {cfg.label}
                    </p>
                    {result.ticket && (
                      <>
                        <p className="text-white font-semibold mt-1">{result.ticket.ticketTypeName}</p>
                        <p className="text-slate-400 text-sm">{result.ticket.eventTitle}</p>
                        <p className="text-slate-500 text-xs mt-1 font-mono">{result.ticket.ticketId}</p>
                      </>
                    )}
                    {result.message && (
                      <p className="text-slate-400 text-sm mt-1">{result.message}</p>
                    )}
                    {result.checkedInAt && result.state === 'duplicate' && (
                      <p className="text-amber-400/70 text-xs mt-2">
                        Checked in at {new Date(result.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs">Resuming in 3s…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {scanning && !result && (
            <p className="text-center text-slate-500 text-xs">
              Hold the QR code steady within the frame
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
