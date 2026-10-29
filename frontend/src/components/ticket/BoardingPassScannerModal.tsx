import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Ship,
  User,
  Calendar,
  Clock,
  MapPin,
  Users,
  RefreshCw,
  Sparkles,
  QrCode,
  FlipHorizontal,
  ShieldCheck,
  Check
} from 'lucide-react';
import { verifyTicket, markTicketUsed } from '../../api/bookings';
import { Booking } from '../../api/types';

interface BoardingPassScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentBookings?: Booking[];
  onBoardingSuccess?: () => void;
}

type ScanMode = 'camera' | 'upload';

export const BoardingPassScannerModal: React.FC<BoardingPassScannerModalProps> = ({
  isOpen,
  onClose,
  recentBookings = [],
  onBoardingSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<ScanMode>('camera');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [ticketData, setTicketData] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [admitting, setAdmitting] = useState<boolean>(false);
  const [admittedSuccess, setAdmittedSuccess] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play audio chime on successful scan
  const playScanBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, []);

  // Clean extract ticket code from URL or raw text
  const extractCode = (raw: string): string => {
    let clean = raw.trim();
    if (clean.includes('/ticket/verify/')) {
      const parts = clean.split('/ticket/verify/');
      clean = parts[parts.length - 1].split('?')[0].split('#')[0].trim();
      try {
        clean = decodeURIComponent(clean);
      } catch {}
    }
    return clean;
  };

  // Process and verify scanned code
  const handleProcessCode = useCallback(async (rawCode: string) => {
    const cleanCode = extractCode(rawCode);
    if (!cleanCode) return;

    // Prevent immediate re-scan of the same code
    if (cleanCode === lastScannedCode && ticketData) {
      return;
    }

    setLastScannedCode(cleanCode);
    playScanBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([80, 40, 80]); } catch {}
    }

    setIsVerifying(true);
    setVerifyError(null);
    setAdmittedSuccess(false);

    try {
      const res = await verifyTicket(cleanCode);
      setTicketData(res);
    } catch (err: any) {
      console.error('Verification error:', err);
      setVerifyError(err.message || `No valid reservation found for code: "${cleanCode}"`);
      setTicketData(null);
    } finally {
      setIsVerifying(false);
    }
  }, [lastScannedCode, playScanBeep, ticketData]);

  // Stop camera tracks
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Scan frame from video feed using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          stopCamera();
          handleProcessCode(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleProcessCode, stopCamera]);

  // Start camera feed
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this browser or requires HTTPS.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings or use manual input.');
      } else {
        setCameraError('Unable to start camera. Please verify camera device or switch to manual ticket entry.');
      }
    }
  }, [cameraFacing, scanFrame, stopCamera]);

  // Manage camera lifecycle based on modal state and mode
  useEffect(() => {
    if (isOpen && activeMode === 'camera' && !ticketData) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, ticketData, cameraFacing, startCamera, stopCamera]);

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleProcessCode(code.data);
          } else {
            setVerifyError('Could not find a valid QR Code in the uploaded image. Please try another image or enter code manually.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Admit passenger to ON_TRIP / ON_RIDE, or complete ride to COMPLETED
  const handleTransitPassenger = async (action: 'board' | 'complete') => {
    if (!ticketData) return;
    const codeToUse = ticketData.verification_code || ticketData.ticket_id || ticketData.booking_id;
    if (!codeToUse) return;

    setAdmitting(true);
    try {
      const res = await markTicketUsed(codeToUse, action);
      try {
        confetti({
          particleCount: action === 'complete' ? 110 : 80,
          spread: 75,
          origin: { y: 0.6 },
          colors: action === 'complete'
            ? ['#0284c7', '#38bdf8', '#10b981', '#f59e0b', '#6366f1']
            : ['#059669', '#10b981', '#34d399', '#38bdf8', '#fbbf24'],
        });
      } catch {}

      const isActivity = ticketData.is_activity || ticketData.booking_type?.includes('Activity');
      const nextOnState = isActivity ? 'ON_RIDE' : 'ON_TRIP';

      if (action === 'board') {
        setTicketData((prev: any) =>
          prev
            ? {
                ...prev,
                valid: true,
                is_valid: true,
                status: nextOnState,
                status_display: `GUEST ADMITTED • CURRENTLY ${isActivity ? 'ON RIDE' : 'ON TRIP'}`,
                trip_phase: 'ACTIVE',
                tracking_status: nextOnState,
                can_mark_used: true,
                can_board: false,
                can_complete: true,
              }
            : null
        );
      } else {
        setAdmittedSuccess(true);
        setTicketData((prev: any) =>
          prev
            ? {
                ...prev,
                valid: false,
                is_valid: false,
                status: 'USED',
                status_display: `${isActivity ? 'RIDE' : 'VOYAGE'} COMPLETED • PASS USED`,
                trip_phase: 'COMPLETED',
                tracking_status: 'COMPLETED',
                can_mark_used: false,
                can_board: false,
                can_complete: false,
              }
            : null
        );
      }

      if (onBoardingSuccess) {
        onBoardingSuccess();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('booking-updated'));
        window.dispatchEvent(new CustomEvent('notification-updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update passenger status.');
    } finally {
      setAdmitting(false);
    }
  };

  // Reset to scan next passenger
  const handleScanNext = () => {
    setTicketData(null);
    setVerifyError(null);
    setAdmittedSuccess(false);
    setLastScannedCode(null);
    setActiveMode('camera');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Ship className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                  Ship Boarding Gate Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                  Live Entry Check
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Scan customer boarding pass QR code to admit passenger for ship entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* If Ticket Data is loaded, display the Verified Ticket Details */}
          {ticketData ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* TICKET STATUS BANNER */}
              {(() => {
                const isActivity = ticketData.is_activity || ticketData.booking_type?.includes('Activity');
                const onLabel = isActivity ? 'ON RIDE' : 'ON TRIP';
                const isCompleted = ticketData.status === 'USED' || ticketData.status === 'COMPLETED' || ticketData.trip_phase === 'COMPLETED';
                const isOnTripOrRide = (ticketData.status === 'ON_TRIP' || ticketData.status === 'ON_RIDE' || ticketData.trip_phase === 'ACTIVE' || ticketData.tracking_status === 'ON_TRIP' || ticketData.tracking_status === 'ON_RIDE') && !isCompleted;
                const isReadyToBoard = (ticketData.valid || ticketData.trip_phase === 'READY_TO_BOARD' || ticketData.status === 'CONFIRMED' || ticketData.status === 'VALID') && !isOnTripOrRide && !isCompleted;

                if (isCompleted) {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-md">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                          {isActivity ? 'Water Sports Ride Finished' : 'Voyage Completed'} • Pass Used
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Ride or voyage has concluded. Boarding pass was verified and marked COMPLETED.
                        </p>
                      </div>
                    </div>
                  );
                }

                if (isOnTripOrRide) {
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 text-white shadow-lg shadow-sky-600/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest font-black text-sky-200 block">
                            Passenger Currently Active
                          </span>
                          <h4 className="text-base font-black">
                            PASSENGER {onLabel} • NON-CANCELLABLE
                          </h4>
                          <p className="text-xs text-white/90">
                            {isActivity ? 'Guest is currently enjoying the water sports ride.' : 'Passenger has boarded and vessel is currently on trip.'}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white/25 text-white text-xs font-bold shrink-0 animate-pulse">
                        ● Live {onLabel}
                      </span>
                    </div>
                  );
                }

                if (isReadyToBoard) {
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest font-black text-emerald-100 block">
                            Verified Valid Pass
                          </span>
                          <h4 className="text-base font-black">
                            READY FOR ENTRY ({onLabel})
                          </h4>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white/25 text-white text-xs font-bold shrink-0">
                        Clearance: OK
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-900 dark:text-rose-100 uppercase tracking-wide">
                        {ticketData.status_display || 'Invalid Boarding Pass'}
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                        Status: {ticketData.status}. Entry cannot proceed.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* TICKET DETAILS CARD */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-4">
                
                {/* Header: Passenger & Ship */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-600/10 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 flex items-center justify-center font-bold text-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Passenger Name
                      </p>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {ticketData.passenger_name || 'Passenger'}
                      </h3>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Booking Reference &amp; Ticket ID
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {ticketData.booking_id} • {ticketData.ticket_id}
                    </p>
                  </div>
                </div>

                {/* Grid of Key Journey Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                      <Ship className="w-3 h-3 text-sky-600" />
                      Ship / Vessel
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                      {ticketData.ship_name || 'Luxury Vessel'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      Departure Date
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                      {ticketData.departure_date}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      Boarding Time
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                      {ticketData.departure_time || '10:00 AM'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-600" />
                      Guest Count
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block mt-0.5">
                      {ticketData.passengers_count} Guest{ticketData.passengers_count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Route & Cabin */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {ticketData.departure_port} → {ticketData.destination}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold text-[11px] border border-sky-200 dark:border-sky-800">
                      Cabin: {ticketData.cabin_seat || 'Standard Deck'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
                      Paid: ₹{Number(ticketData.total_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {(() => {
                const isActivity = ticketData.is_activity || ticketData.booking_type?.includes('Activity');
                const isCompleted = ticketData.status === 'USED' || ticketData.status === 'COMPLETED' || ticketData.trip_phase === 'COMPLETED';
                const isOnTripOrRide = (ticketData.status === 'ON_TRIP' || ticketData.status === 'ON_RIDE' || ticketData.trip_phase === 'ACTIVE' || ticketData.tracking_status === 'ON_TRIP' || ticketData.tracking_status === 'ON_RIDE') && !isCompleted;
                const isReadyToBoard = (ticketData.valid || ticketData.trip_phase === 'READY_TO_BOARD' || ticketData.status === 'CONFIRMED' || ticketData.status === 'VALID') && !isOnTripOrRide && !isCompleted;

                return (
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    {/* Step 1: Admit & Start Trip / Ride */}
                    {isReadyToBoard && (
                      <button
                        type="button"
                        onClick={() => handleTransitPassenger('board')}
                        disabled={admitting}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {admitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Admitting Passenger...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                            <span>{isActivity ? 'Admit Passenger & Start Ride (On Ride)' : 'Admit Passenger & Board Ship (On Trip)'}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Step 2: Complete Voyage / Ride */}
                    {isOnTripOrRide && (
                      <button
                        type="button"
                        onClick={() => handleTransitPassenger('complete')}
                        disabled={admitting}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-700 hover:to-blue-800 text-white font-black text-sm shadow-lg shadow-sky-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {admitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Marking Completed...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 text-amber-200" />
                            <span>{isActivity ? 'Finish Ride & Mark Completed' : 'Complete Voyage & Mark Used'}</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleScanNext}
                      className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4 text-sky-600" />
                      <span>Scan Next Passenger</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* SCANNER TABS & MODES */
            <div className="space-y-4">
              
              {/* Scan Mode Tabs (Camera Scanner & Upload QR Image) */}
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('camera');
                    setVerifyError(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === 'camera'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera Scanner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('upload');
                    setVerifyError(null);
                    stopCamera();
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload QR Image</span>
                </button>
              </div>

              {/* Verify error banner */}
              {verifyError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* Verification loader */}
              {isVerifying && (
                <div className="p-6 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-sky-900 dark:text-sky-100">
                    Verifying Boarding Pass with Fleet Gateway...
                  </p>
                  <p className="text-xs text-slate-500">
                    Retrieving passenger manifest, voyage details &amp; ticket validity.
                  </p>
                </div>
              )}

              {/* MODE 1: LIVE CAMERA SCANNER */}
              {activeMode === 'camera' && !isVerifying && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-[4/3] max-h-[360px] flex items-center justify-center border-2 border-slate-800 shadow-inner">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanner HUD Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center">
                        {/* Corner Target Guides */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-0.5 -ml-0.5" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-0.5 -mr-0.5" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-0.5 -ml-0.5" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-0.5 -mr-0.5" />

                        {/* Animated Laser Scanning Line */}
                        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[bounce_2.5s_infinite]" />
                      </div>
                    </div>

                    {/* Switch camera button */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                        className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs backdrop-blur-md border border-white/20 transition cursor-pointer flex items-center gap-1.5"
                        title="Flip Camera (Front/Rear)"
                      >
                        <FlipHorizontal className="w-4 h-4 text-emerald-400" />
                        <span className="hidden sm:inline">Flip Camera</span>
                      </button>
                    </div>

                    {/* Camera error message */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/90 p-5 flex flex-col items-center justify-center text-center text-white">
                        <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                        <p className="text-xs sm:text-sm font-semibold max-w-sm mb-3">
                          {cameraError}
                        </p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Retry Camera
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Point camera steadily at the passenger&apos;s digital boarding pass QR or printed voucher.
                  </p>
                </div>
              )}

              {/* MODE 2: IMAGE UPLOAD */}
              {activeMode === 'upload' && !isVerifying && (
                <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Upload Boarding Pass QR Image
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload a photo of passenger&apos;s printed ticket or a screenshot sent via WhatsApp.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition">
                    <QrCode className="w-4 h-4" />
                    <span>Select QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}



            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Cruise-Hunt Official Gate Checkpoint
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
