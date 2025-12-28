import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/browser';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, LogOut, Keyboard, Camera } from 'lucide-react';

export default function Scanner({ token, onLogout }) {
  const [scanResult, setScanResult] = useState(null);
  const [ticketId, setTicketId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const webcamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const validateTicket = async (ticketIdToScan) => {
    setScanning(true);

    try {
      const response = await axios.post(`${API}/tickets/scan`, 
        { ticket_id: ticketIdToScan.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScanResult(response.data);
      setCameraMode(false);
      stopScanning();
    } catch (error) {
      if (error.response?.data) {
        setScanResult(error.response.data);
        setCameraMode(false);
        stopScanning();
      } else {
        toast.error(error.response?.data?.detail || 'Scan failed');
      }
    } finally {
      setScanning(false);
      setTicketId('');
    }
  };

  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    await validateTicket(ticketId);
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const startScanning = useCallback(() => {
    const codeReader = new BrowserMultiFormatReader();
    
    scanIntervalRef.current = setInterval(async () => {
      if (webcamRef.current && !scanning) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          try {
            const result = await codeReader.decodeFromImageUrl(imageSrc);
            if (result && result.text) {
              console.log('QR Code detected:', result.text);
              validateTicket(result.text);
            }
          } catch (err) {
            // No QR code found in this frame, continue scanning
          }
        }
      }
    }, 500); // Scan every 500ms
  }, [scanning]);

  const handleRescan = () => {
    setScanResult(null);
    setTicketId('');
    setCameraError(null);
  };

  const toggleCameraMode = async () => {
    if (!cameraMode) {
      // Switching to camera mode
      setCameraError(null);
      setScanResult(null);
      
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported on this browser. Please use Chrome, Safari, or Firefox.');
        toast.error('Camera not supported');
        return;
      }
      
      // Request camera permission - try environment first (mobile), fallback to user (desktop)
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } } 
          });
        } catch (err) {
          // Fallback to front camera (desktop/laptop)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
        }
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        
        setCameraMode(true);
        toast.success('Camera ready - point at QR code');
        // Start scanning after a delay to let webcam component initialize
        setTimeout(() => {
          startScanning();
        }, 1500);
      } catch (err) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please click "Allow" when your browser asks for camera access.');
          toast.error('Camera permission needed');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found on this device.');
          toast.error('No camera available');
        } else {
          setCameraError(`Camera error: ${err.message}`);
          toast.error('Camera unavailable');
        }
      }
    } else {
      // Switching back to manual mode
      stopScanning();
      setCameraMode(false);
      setCameraError(null);
    }
  };

  const handleUserMedia = () => {
    console.log('Camera stream started');
  };

  const handleUserMediaError = (error) => {
    console.error('Camera error:', error);
    setCameraError('Failed to access camera. Please check permissions.');
    setCameraMode(false);
    toast.error('Camera access failed');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-[#121212]/90 border-b-2 border-[#333] p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="concert-heading text-3xl text-[#FF0000]" data-testid="scanner-heading">SCANNER</h1>
          <button
            onClick={onLogout}
            className="text-[#888] hover:text-white transition-colors"
            data-testid="logout-button"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>

      {/* Scanner Interface */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {!scanResult ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-6"
              >
                {/* Mode Toggle */}
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={() => { 
                      if (cameraMode) {
                        stopScanning();
                        setCameraMode(false);
                      }
                      setCameraError(null); 
                    }}
                    className={`px-6 py-3 uppercase tracking-wider font-bold border-2 flex items-center gap-2 ${
                      !cameraMode 
                        ? 'bg-[#FF0000] text-white border-[#FF0000]' 
                        : 'bg-transparent text-[#888] border-[#333] hover:border-[#FF0000] hover:text-[#FF0000]'
                    }`}
                    data-testid="manual-mode-button"
                  >
                    <Keyboard size={20} />
                    MANUAL
                  </button>
                  <button
                    onClick={toggleCameraMode}
                    className={`px-6 py-3 uppercase tracking-wider font-bold border-2 flex items-center gap-2 ${
                      cameraMode 
                        ? 'bg-[#FF0000] text-white border-[#FF0000]' 
                        : 'bg-transparent text-[#888] border-[#333] hover:border-[#FF0000] hover:text-[#FF0000]'
                    }`}
                    data-testid="camera-mode-button"
                  >
                    <Camera size={20} />
                    CAMERA
                  </button>
                </div>

                {cameraMode ? (
                  /* Camera Scanner */
                  <div className="bg-[#121212]/80 border-2 border-[#FF0000] p-6 scanline-effect" data-testid="camera-scanner">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <Camera size={48} className="text-[#FF0000] animate-pulse" />
                      <h2 className="text-3xl font-bold uppercase text-[#FF0000]">SCAN QR CODE</h2>
                    </div>

                    {cameraError ? (
                      <div className="bg-[#FF3333]/20 border-2 border-[#FF3333] p-6 text-center space-y-4">
                        <XCircle size={60} className="mx-auto text-[#FF3333]" />
                        <p className="text-[#FF3333] font-mono text-sm">{cameraError}</p>
                        <div className="bg-[#1E1E1E] p-4 text-left text-xs text-[#888]">
                          <p className="font-bold text-white mb-2">To enable camera:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Look for camera icon in browser address bar</li>
                            <li>Click "Allow" when prompted</li>
                            <li>On iOS: Settings → Safari → Camera</li>
                            <li>On Android: Settings → Site Settings → Camera</li>
                          </ul>
                        </div>
                        <button
                          onClick={toggleCameraMode}
                          className="retro-button w-full"
                        >
                          TRY AGAIN
                        </button>
                      </div>
                    ) : (
                      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: '500px' }}>
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          videoConstraints={{
                            facingMode: 'environment',
                            width: 1280,
                            height: 720
                          }}
                          onUserMedia={handleUserMedia}
                          onUserMediaError={handleUserMediaError}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Scanning overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Corner markers */}
                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-4 border-[#FF0000]">
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#FF0000]"></div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#FF0000]"></div>
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#FF0000]"></div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#FF0000]"></div>
                          </div>
                          
                          {/* Scanning line animation */}
                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 overflow-hidden">
                            <div className="w-full h-0.5 bg-[#FF0000] animate-scan"></div>
                          </div>
                        </div>

                        {scanning && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-[#FF0000] font-bold text-2xl uppercase">VALIDATING...</div>
                          </div>
                        )}
                        
                        <div className="absolute top-4 left-4 right-4 bg-black/70 p-3 text-center">
                          <p className="text-[#FF0000] font-bold text-sm uppercase">Camera Active - Point at QR Code</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-[#1E1E1E] border border-[#333]">
                      <p className="text-xs text-[#888] uppercase tracking-wider text-center">
                        {cameraError ? 'Grant camera permission when prompted' : 'Position QR code within the red square'}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Manual Entry */
                  <div className="bg-[#121212]/80 border-2 border-[#FF0000] p-8 scanline-effect">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <ScanLine size={48} className="text-[#FF0000] animate-pulse" />
                      <h2 className="text-3xl font-bold uppercase text-[#FF0000]">SCAN TICKET</h2>
                    </div>

                    <form onSubmit={handleManualScan} className="space-y-6" data-testid="scan-form">
                      <div>
                        <label className="block text-sm uppercase tracking-wider mb-3 text-[#888] font-mono flex items-center gap-2">
                          <Keyboard size={16} />
                          Enter Ticket ID
                        </label>
                        <input
                          type="text"
                          value={ticketId}
                          onChange={(e) => setTicketId(e.target.value)}
                          className="retro-input text-center text-lg"
                          placeholder="Paste or type ticket ID here"
                          data-testid="ticket-id-input"
                          autoFocus
                          disabled={scanning}
                        />
                      </div>

                      <button
                        type="submit"
                        className="retro-button w-full text-xl py-6"
                        disabled={!ticketId.trim() || scanning}
                        data-testid="scan-button"
                      >
                        {scanning ? 'VALIDATING...' : 'VALIDATE TICKET'}
                      </button>
                    </form>

                    <div className="mt-8 p-4 bg-[#1E1E1E] border border-[#333]">
                      <p className="text-xs text-[#888] uppercase tracking-wider text-center">
                        Ticket IDs can be found in the email or admin dashboard
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[#888] font-mono text-sm">
                    {cameraMode 
                      ? 'Point camera at QR code for instant validation' 
                      : 'Staff can copy ticket IDs from attendee emails or use camera mode'
                    }
                  </p>
                </div>
              </motion.div>
            ) : (
              /* Scan Result */
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {scanResult.success ? (
                  <div className="bg-[#FF0000] text-white p-12 text-center glow-red" data-testid="scan-success">
                    <CheckCircle2 size={100} className="mx-auto mb-6" />
                    <h2 className="text-6xl font-bold uppercase mb-6">VALID TICKET</h2>
                    <div className="space-y-3">
                      <p className="text-3xl font-bold">{scanResult.event_name}</p>
                      <p className="font-mono text-base opacity-80">ID: {scanResult.ticket_id}</p>
                      <p className="font-mono text-base opacity-80">
                        Scanned: {new Date(scanResult.scan_timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FF3333] text-black p-12 text-center glow-red" data-testid="scan-failure">
                    <XCircle size={100} className="mx-auto mb-6" />
                    <h2 className="text-6xl font-bold uppercase mb-6">TICKET ALREADY USED</h2>
                    <div className="space-y-3">
                      <p className="text-2xl font-bold">ENTRY DENIED</p>
                      <p className="font-mono text-base opacity-80">ID: {scanResult.ticket_id}</p>
                      {scanResult.original_scan_time && (
                        <div className="mt-4 p-4 bg-black/20">
                          <p className="font-mono text-sm opacity-90">
                            Originally scanned: {new Date(scanResult.original_scan_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleRescan}
                  className="retro-button w-full mt-6 text-xl py-6"
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
