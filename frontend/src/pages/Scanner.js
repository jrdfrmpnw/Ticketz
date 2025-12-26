import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, LogOut } from 'lucide-react';

export default function Scanner({ token, onLogout }) {
  const [scanning, setScanning] = useState(true);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    if (scanning) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      const onScanSuccessWrapper = async (decodedText) => {
        html5QrcodeScanner.clear();
        setScanning(false);

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
            setScanning(true);
          }
        }
      };

      const onScanFailureWrapper = (error) => {
        // Ignore scan failures
      };

      html5QrcodeScanner.render(onScanSuccessWrapper, onScanFailureWrapper);

      return () => {
        html5QrcodeScanner.clear().catch(() => {});
      };
    }
  }, [scanning, token]);

  const onScanSuccess = async (decodedText) => {
    if (scanner) {
      scanner.clear();
    }
    setScanning(false);

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
        setScanning(true);
      }
    }
  };

  const onScanFailure = (error) => {
    // Ignore scan failures (happens continuously while searching for QR code)
  };

  const handleRescan = () => {
    setScanResult(null);
    setScanning(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-[#121212] border-b-2 border-[#333] p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="concert-heading text-3xl text-[#00FF94]" data-testid="scanner-heading">SCANNER</h1>
          <button
            onClick={onLogout}
            className="text-[#888] hover:text-white transition-colors"
            data-testid="logout-button"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>

      {/* Scanner/Result */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {scanning ? (
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