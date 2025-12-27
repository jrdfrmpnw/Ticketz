import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, LogOut } from 'lucide-react';

export default function Scanner({ token, onLogout }) {
  const [scanResult, setScanResult] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualTicketId, setManualTicketId] = useState('');
  const scannerRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!manualMode && !scanResult && !isInitialized.current) {
      isInitialized.current = true;
      
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      const onScanSuccess = async (decodedText) => {
        scanner.clear().catch(() => {});
        
        try {
          const response = await axios.post(`${API}/tickets/scan`, 
            { ticket_id: decodedText },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setScanResult(response.data);
        } catch (error) {
          if (error.response?.data) {
            setScanResult(error.response.data);
          } else {
            toast.error('Scan failed');
          }
        }
      };

      const onScanFailure = () => {
        // Ignore continuous scan failures
      };

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [manualMode, scanResult, token]);

  const handleRescan = () => {
    setScanResult(null);
    setManualMode(false);
    setManualTicketId('');
    isInitialized.current = false;
  };

  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!manualTicketId.trim()) return;

    try {
      const response = await axios.post(`${API}/tickets/scan`, 
        { ticket_id: manualTicketId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScanResult(response.data);
    } catch (error) {
      if (error.response?.data) {
        setScanResult(error.response.data);
      } else {
        toast.error('Scan failed');
      }
    }
  };

  const toggleManualMode = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }
    isInitialized.current = false;
    setScanResult(null);
    setManualMode(!manualMode);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-[#121212] border-b-2 border-[#333] p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="concert-heading text-3xl text-[#00FF94]" data-testid="scanner-heading">SCANNER</h1>
          <div className="flex items-center gap-4">
            {!scanResult && (
              <button
                onClick={toggleManualMode}
                className="text-[#888] hover:text-[#00FF94] transition-colors text-sm uppercase tracking-wider"
                data-testid="toggle-mode-button"
              >
                {manualMode ? 'QR Mode' : 'Manual ID'}
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-[#888] hover:text-white transition-colors"
              data-testid="logout-button"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Scanner/Result */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {manualMode && !scanResult ? (
              <motion.div
                key="manual"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#121212] border-2 border-[#00FF94] p-8"
              >
                <h2 className="text-2xl font-bold uppercase text-center mb-6 text-[#00FF94]">Enter Ticket ID</h2>
                <form onSubmit={handleManualScan} className="space-y-6" data-testid="manual-scan-form">
                  <input
                    type="text"
                    value={manualTicketId}
                    onChange={(e) => setManualTicketId(e.target.value)}
                    className="retro-input text-center"
                    placeholder="Paste or type ticket ID"
                    data-testid="manual-ticket-input"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="retro-button w-full"
                    disabled={!manualTicketId.trim()}
                    data-testid="manual-scan-button"
                  >
                    SCAN TICKET
                  </button>
                </form>
                <p className="text-center text-[#888] text-sm font-mono uppercase tracking-wider mt-6">
                  Use this for manual entry or testing
                </p>
              </motion.div>
            ) : !manualMode && !scanResult ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="scanline-effect"
              >
                <div className="bg-[#121212] border-2 border-[#00FF94] p-6 mb-4">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <ScanLine size={32} className="text-[#00FF94] animate-pulse" />
                    <p className="text-xl uppercase tracking-wider text-[#00FF94]">SCANNING...</p>
                  </div>
                  <div id="qr-reader" className="w-full" data-testid="qr-reader"></div>
                </div>
                <p className="text-center text-[#888] text-sm font-mono uppercase tracking-wider">
                  Position QR code within the frame
                </p>
              </motion.div>
            ) : scanResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {scanResult.success ? (
                  <div className="bg-[#00FF94] text-black p-12 text-center glow-green" data-testid="scan-success">
                    <CheckCircle2 size={80} className="mx-auto mb-6" />
                    <h2 className="text-5xl font-bold uppercase mb-4">VALID TICKET</h2>
                    <p className="text-2xl mb-2">{scanResult.event_name}</p>
                    <p className="font-mono text-sm opacity-70">ID: {scanResult.ticket_id}</p>
                    <p className="font-mono text-sm opacity-70 mt-2">
                      Scanned: {new Date(scanResult.scan_timestamp).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#FF3333] text-black p-12 text-center glow-red" data-testid="scan-failure">
                    <XCircle size={80} className="mx-auto mb-6" />
                    <h2 className="text-5xl font-bold uppercase mb-4">TICKET ALREADY USED</h2>
                    <p className="text-xl mb-2">Entry Denied</p>
                    <p className="font-mono text-sm opacity-70">ID: {scanResult.ticket_id}</p>
                    {scanResult.original_scan_time && (
                      <p className="font-mono text-sm opacity-70 mt-2">
                        Originally scanned: {new Date(scanResult.original_scan_time).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handleRescan}
                  className="retro-button w-full mt-6"
                  data-testid="scan-next-button"
                >
                  SCAN NEXT TICKET
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
