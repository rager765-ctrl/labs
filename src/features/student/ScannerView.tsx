import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X, Flashlight, Camera, KeyRound, AlertCircle, RefreshCw, SwitchCamera, Locate, CheckCircle2 } from 'lucide-react';
import { ConfirmationSheet } from '../../components/common/ConfirmationSheet';
import type { ConfirmationSheetProps } from '../../components/common/ConfirmationSheet';
import { formatTime } from '../../services/storage';
import { getDeviceCurrentPosition, evaluateGeofenceProximity, formatDistance } from '../../services/geoService';
import jsQR from 'jsqr';

export const ScannerView: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, currentUser, checkInStudent, checkOutStudent, attendanceRecords } = useApp();

  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
  const [pinError, setPinError] = useState('');
  const [hasScannedCode, setHasScannedCode] = useState(false);

  // Geolocation & Proximity State (Real Device Hardware GPS)
  const [studentCoords, setStudentCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'acquiring' | 'verified' | 'out_of_range' | 'denied' | 'disabled'>('acquiring');
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [geoErrorMsg, setGeoErrorMsg] = useState<string>('');

  // Confirmation sheet state
  const [sheetConfig, setSheetConfig] = useState<Omit<ConfirmationSheetProps, 'isOpen' | 'onClose'> & { isOpen: boolean }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Identify today's active live or primary session
  const activeSession = sessions.find(s => s.status === 'live') || sessions[0];

  const applyCoordinates = useCallback((lat: number, lng: number, acc = 8) => {
    const coords = { latitude: lat, longitude: lng, accuracy: acc };
    setStudentCoords(coords);
    if (activeSession?.geofence && activeSession.geofence.enabled) {
      const evalRes = evaluateGeofenceProximity(lat, lng, acc, activeSession.geofence);
      setGeoDistance(evalRes.distanceMeters);
      setGeoStatus(evalRes.isWithin ? 'verified' : 'out_of_range');
    } else {
      setGeoStatus('verified');
      setGeoDistance(null);
    }
  }, [activeSession]);

  const requestDeviceGps = useCallback(() => {
    setGeoStatus('acquiring');
    setGeoErrorMsg('');
    getDeviceCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
      .then(pos => {
        applyCoordinates(pos.latitude, pos.longitude, pos.accuracy);
      })
      .catch(err => {
        console.warn('Real GPS access failed or denied:', err.message);
        setGeoStatus('denied');
        setGeoErrorMsg(err.message || 'Location permission is required to verify laboratory room proximity.');
        setStudentCoords(null);
      });
  }, [applyCoordinates]);

  useEffect(() => {
    requestDeviceGps();
  }, [requestDeviceGps]);

  // Play subtle feedback beep using Web Audio API on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  // Process a detected QR code string
  const handleDetectedCode = useCallback((codeText: string) => {
    if (hasScannedCode) return;
    setHasScannedCode(true);
    playBeep();

    // Check if code matches any session or active session
    const matchedSession = sessions.find(
      s => s.qrCode === codeText || s.id === codeText || codeText.includes(s.pin || '____') || codeText.includes(s.courseCode || '')
    ) || activeSession;

    if (!matchedSession) {
      setSheetConfig({
        isOpen: true,
        type: 'error',
        title: 'Unrecognized QR Code',
        message: `Scanned: "${codeText.substring(0, 40)}". This code does not match any current university laboratory session.`,
        primaryActionText: 'Scan Again',
        onPrimaryAction: () => {
          setHasScannedCode(false);
          setSheetConfig(prev => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    if (!currentUser) {
      setSheetConfig({
        isOpen: true,
        type: 'error',
        title: 'Sign In Required',
        message: 'You must be signed in with your university student account to record attendance.',
        primaryActionText: 'Sign In',
        onPrimaryAction: () => navigate('/login'),
      });
      return;
    }

    const currentRec = attendanceRecords.find(r => r.sessionId === matchedSession.id && r.studentId === currentUser.id);
    const checkedIn = currentRec && (currentRec.status === 'present' || currentRec.status === 'late');

    if (checkedIn && !currentRec.checkedOutAt && matchedSession.requiresCheckOut) {
      // Check out
      const result = checkOutStudent(matchedSession.id, currentUser.id, studentCoords || undefined);
      setSheetConfig({
        isOpen: true,
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Checked Out Successfully' : 'Check-Out Notice',
        message: result.message,
        details: [
          { label: 'Practical', value: matchedSession.title },
          { label: 'Room', value: matchedSession.room },
          { label: 'Exit Time', value: formatTime(new Date().toISOString()) },
          ...(result.distanceMeters !== undefined ? [{ label: 'Proximity', value: `${formatDistance(result.distanceMeters)} from venue` }] : []),
        ],
        primaryActionText: 'Return to Home',
        onPrimaryAction: () => navigate('/student'),
      });
    } else {
      // Check in
      const result = checkInStudent(matchedSession.id, currentUser.id, 'Camera QR Scan', studentCoords || undefined);
      if (result.success) {
        setSheetConfig({
          isOpen: true,
          type: result.code === 'success_late' ? 'warning' : 'success',
          title: result.code === 'success_late' ? 'Recorded Late' : 'Check-In Confirmed',
          message: result.message,
          details: [
            { label: 'Course', value: matchedSession.courseCode || 'LAB' },
            { label: 'Session', value: matchedSession.title },
            { label: 'Room', value: matchedSession.room },
            { label: 'Status', value: result.code === 'success_late' ? 'Late (+15m)' : 'Present on Time' },
            { label: 'Proximity', value: result.distanceMeters !== undefined ? `Verified in Lab (${formatDistance(result.distanceMeters)})` : 'Verified on Campus' },
            { label: 'Timestamp', value: formatTime(result.record?.checkedInAt || new Date().toISOString()) },
          ],
          primaryActionText: 'View Dashboard',
          onPrimaryAction: () => navigate('/student'),
        });
      } else {
        const isGeoError = result.code === 'geofence_out_of_range' || result.code === 'geolocation_required';
        setSheetConfig({
          isOpen: true,
          type: isGeoError ? 'error' : result.code === 'already_checked_in' ? 'info' : 'error',
          title: result.code === 'geofence_out_of_range'
            ? 'Location Verification Failed'
            : result.code === 'geolocation_required'
            ? 'GPS Location Required'
            : result.code === 'already_checked_in'
            ? 'Already Recorded'
            : 'Check-In Notice',
          message: result.message,
          details: result.code === 'geofence_out_of_range' ? [
            { label: 'Venue', value: result.venueName || matchedSession.room },
            { label: 'Your Distance', value: formatDistance(result.distanceMeters || 0) },
            { label: 'Allowed Range', value: `Within ${result.requiredRadius || 50}m` },
            { label: 'Requirement', value: 'Physical presence in lab' },
          ] : undefined,
          primaryActionText: 'Scan Again',
          onPrimaryAction: () => {
            setHasScannedCode(false);
            setSheetConfig(prev => ({ ...prev, isOpen: false }));
          },
        });
      }
    }
  }, [hasScannedCode, sessions, activeSession, attendanceRecords, currentUser?.id, studentCoords, checkInStudent, checkOutStudent, navigate]);

  // Start Camera stream with resilient multi-level fallbacks
  const startCamera = useCallback(async () => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraErrorMsg('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission('unavailable');
      setCameraErrorMsg('Camera API is not supported in this browser or security context.');
      return;
    }

    let stream: MediaStream | null = null;

    // 1st Attempt: with preferred facingMode
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1: any) {
      console.warn('Initial camera constraints failed, attempting fallback to generic video: true', err1);
      // 2nd Attempt: fallback to any available video camera (crucial for desktops/laptops)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2: any) {
        console.error('All camera attempts failed:', err2);
        if (err2.name === 'NotAllowedError' || err2.name === 'PermissionDeniedError') {
          setCameraPermission('denied');
          setCameraErrorMsg('Camera access was blocked. Please permit camera access in your browser address bar.');
        } else if (err2.name === 'NotFoundError' || err2.name === 'DevicesNotFoundError') {
          setCameraPermission('unavailable');
          setCameraErrorMsg('No camera hardware was detected on this device.');
        } else {
          setCameraPermission('denied');
          setCameraErrorMsg(`Camera error: ${err2.message || 'Unable to access hardware camera'}.`);
        }
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setCameraPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          }).catch(err => {
            console.warn('Video play interrupted:', err);
            setCameraReady(true);
          });
        };
      }
    }
  }, [facingMode]);

  // Request camera on mount or when switching facing mode
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      // Pause camera stream when on PIN tab to save power
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeTab, startCamera]);

  // Continuous QR Code Scanning Loop
  useEffect(() => {
    if (!cameraReady || activeTab !== 'camera' || hasScannedCode) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let isScanning = true;

    const tick = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qr && qr.data && qr.data.trim()) {
            handleDetectedCode(qr.data.trim());
            return;
          }
        } catch {
          // Ignore frame decode glitch
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isScanning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraReady, activeTab, hasScannedCode, handleDetectedCode]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current) {
      setTorchOn(!torchOn);
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch {
        setTorchOn(!torchOn);
      }
    } else {
      setTorchOn(!torchOn);
    }
  };

  // Flip Camera (environment vs user)
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (!pinInput.trim()) {
      setPinError('Please enter the 4-digit session PIN');
      return;
    }

    if (!activeSession) {
      setPinError('No active session found.');
      return;
    }

    if (activeSession.pin && pinInput.trim() !== activeSession.pin) {
      setPinError('Incorrect session PIN. Please verify with your laboratory coordinator.');
      return;
    }

    if (!currentUser) {
      setPinError('Please sign in to verify session PIN.');
      return;
    }

    playBeep();
    const result = checkInStudent(activeSession.id, currentUser.id, 'Session PIN', studentCoords || undefined);
    if (result.success) {
      setSheetConfig({
        isOpen: true,
        type: 'success',
        title: 'PIN Verified — Check-In Recorded',
        message: 'Your attendance and device proximity were successfully verified via laboratory coordinator PIN.',
        details: [
          { label: 'Practical', value: activeSession.title },
          { label: 'Method', value: `PIN Verification (#${pinInput.trim()})` },
          { label: 'Proximity', value: result.distanceMeters !== undefined ? `Verified in Lab (${formatDistance(result.distanceMeters)})` : 'Verified on Campus' },
          { label: 'Time', value: formatTime(new Date().toISOString()) },
        ],
        primaryActionText: 'Return to Home',
        onPrimaryAction: () => navigate('/student'),
      });
    } else {
      setPinError(result.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1E2024',
        color: '#FFFFFF',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          zIndex: 20,
        }}
      >
        <button
          onClick={() => navigate('/student')}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Close scanner"
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
            Scan QR Code
          </h1>
          <span style={{ fontSize: '11px', color: '#93C5FD', fontWeight: 600 }}>
            {activeSession ? `${activeSession.courseCode} • ${activeSession.room}` : 'Check In'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleFacingMode}
            title="Switch between front and back camera"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Flip camera"
          >
            <SwitchCamera size={18} />
          </button>

          <button
            onClick={toggleTorch}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: torchOn ? '#FFFFFF' : 'rgba(0, 0, 0, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: torchOn ? 'var(--color-ink-900)' : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Toggle flashlight"
          >
            <Flashlight size={18} />
          </button>
        </div>
      </div>

      {/* Mode Tabs: Camera Scan vs Enter PIN */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '4px 16px',
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '4px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <button
            onClick={() => setActiveTab('camera')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activeTab === 'camera' ? 'var(--color-brand-600)' : 'transparent',
              color: '#FFFFFF',
            }}
          >
            <Camera size={14} />
            <span>Live Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('pin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activeTab === 'pin' ? 'var(--color-brand-600)' : 'transparent',
              color: '#FFFFFF',
            }}
          >
            <KeyRound size={14} />
            <span>Enter PIN</span>
          </button>
        </div>
      </div>

      {/* Geolocation & Proximity Live Status Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px 16px 4px 16px', zIndex: 20 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor:
              geoStatus === 'verified'
                ? 'rgba(16, 185, 129, 0.2)'
                : geoStatus === 'out_of_range'
                ? 'rgba(239, 68, 68, 0.25)'
                : geoStatus === 'denied'
                ? 'rgba(245, 158, 11, 0.25)'
                : 'rgba(59, 130, 246, 0.2)',
            color:
              geoStatus === 'verified'
                ? '#34D399'
                : geoStatus === 'out_of_range'
                ? '#FCA5A5'
                : geoStatus === 'denied'
                ? '#FCD34D'
                : '#93C5FD',
            border: `1px solid ${
              geoStatus === 'verified'
                ? 'rgba(52, 211, 153, 0.4)'
                : geoStatus === 'out_of_range'
                ? 'rgba(239, 68, 68, 0.4)'
                : 'rgba(147, 197, 253, 0.3)'
            }`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {geoStatus === 'verified' ? (
            <>
              <CheckCircle2 size={13} />
              <span>
                GPS Verified: Inside Lab ({geoDistance !== null ? formatDistance(geoDistance) : 'In Lab'} from {activeSession?.room?.split(',')[0] || 'Venue'})
              </span>
            </>
          ) : geoStatus === 'out_of_range' ? (
            <>
              <AlertCircle size={13} />
              <span>
                GPS Warning: {geoDistance !== null ? formatDistance(geoDistance) : 'Out of range'} away (Max: {activeSession?.geofence?.radiusMeters || 50}m)
              </span>
            </>
          ) : geoStatus === 'denied' ? (
            <>
              <AlertCircle size={13} />
              <span>{geoErrorMsg ? `Location: ${geoErrorMsg}` : 'GPS Access Denied • Permission Required'}</span>
            </>
          ) : (
            <>
              <Locate size={13} />
              <span>Acquiring Device GPS Signal...</span>
            </>
          )}
        </div>

        {/* GPS Refresh / Retry Control */}
        <button
          type="button"
          onClick={requestDeviceGps}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: '#E2E8F0',
            cursor: 'pointer',
          }}
          title="Refresh hardware GPS position"
        >
          <RefreshCw size={11} className={geoStatus === 'acquiring' ? 'spin' : ''} />
          <span>{geoStatus === 'denied' ? 'Retry GPS' : 'Refresh GPS'}</span>
        </button>
      </div>

      {/* Main View Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {activeTab === 'camera' ? (
          <>
            {/* Camera Video Container with ALWAYS MOUNTED <video> */}
            <div
              style={{
                position: 'relative',
                width: 'min(72vw, 300px)',
                height: 'min(72vw, 300px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#000000',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {/* Actual Video Element ALWAYS IN DOM */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  opacity: cameraReady ? 1 : 0,
                  transition: 'opacity 0.25s ease',
                }}
              />

              {/* Loading / Camera Request Feedback overlay if not ready */}
              {!cameraReady && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: '#1E2330',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    textAlign: 'center',
                    gap: '10px',
                  }}
                >
                  {cameraPermission === 'prompt' && (
                    <>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: '3px solid rgba(255,255,255,0.2)',
                          borderTopColor: 'var(--color-brand-500)',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 500 }}>
                        Connecting to device camera...
                      </span>
                    </>
                  )}

                  {cameraPermission === 'denied' && (
                    <>
                      <AlertCircle size={32} color="#F87171" />
                      <div style={{ fontSize: '12px', color: '#FCA5A5', fontWeight: 600 }}>
                        Camera Permission Blocked
                      </div>
                      <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: '15px' }}>
                        {cameraErrorMsg || 'Please allow camera access in your browser settings to scan live codes.'}
                      </div>
                      <button
                        onClick={startCamera}
                        style={{
                          marginTop: '6px',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RefreshCw size={11} />
                        <span>Try Again</span>
                      </button>
                    </>
                  )}

                  {cameraPermission === 'unavailable' && (
                    <>
                      <Camera size={32} color="#94A3B8" />
                      <div style={{ fontSize: '12px', color: '#E2E8F0', fontWeight: 600 }}>
                        No Camera Detected
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: '15px' }}>
                        Use the "Enter PIN" tab or the "Simulate Scan" action below.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Four Bright White Corner Brackets */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                {/* Top Left */}
                <div style={{ position: 'absolute', top: '10px', left: '10px', width: '28px', height: '28px', borderTop: '4px solid #FFFFFF', borderLeft: '4px solid #FFFFFF', borderTopLeftRadius: '8px' }} />
                {/* Top Right */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', width: '28px', height: '28px', borderTop: '4px solid #FFFFFF', borderRight: '4px solid #FFFFFF', borderTopRightRadius: '8px' }} />
                {/* Bottom Left */}
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '28px', height: '28px', borderBottom: '4px solid #FFFFFF', borderLeft: '4px solid #FFFFFF', borderBottomLeftRadius: '8px' }} />
                {/* Bottom Right */}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '28px', height: '28px', borderBottom: '4px solid #FFFFFF', borderRight: '4px solid #FFFFFF', borderBottomRightRadius: '8px' }} />

                {/* Animated Laser Scan Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '16px',
                    right: '16px',
                    height: '2px',
                    backgroundColor: '#60A5FA',
                    boxShadow: '0 0 10px #60A5FA, 0 0 20px #60A5FA',
                    top: '50%',
                    animation: 'scanLine 2.5s ease-in-out infinite',
                  }}
                />
              </div>
            </div>

            {/* Instruction text with 24px spacing */}
            <div
              style={{
                marginTop: '22px',
                textAlign: 'center',
                maxWidth: '300px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  lineHeight: '19px',
                  margin: 0,
                }}
              >
                Point camera at the lab session QR code. Detection is automatic!
              </p>
              {activeSession && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#93C5FD',
                    backgroundColor: 'rgba(59, 130, 246, 0.25)',
                    padding: '3px 12px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  <span>Active Session: <strong>{activeSession.title.substring(0, 24)}...</strong></span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Enter PIN fallback view */
          <form
            onSubmit={handlePinSubmit}
            style={{
              width: '100%',
              maxWidth: '320px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <KeyRound size={24} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#FFFFFF' }}>
              Enter Session PIN
            </h2>
            <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: '16px' }}>
              The 4-digit code displayed on the lab projector or coordinator screen.
            </p>

            <input
              type="text"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="e.g. 8492"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#FFFFFF',
                fontSize: '22px',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '8px',
                marginBottom: '12px',
                outline: 'none',
              }}
              autoFocus
            />

            {pinError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#F87171',
                  fontSize: '11px',
                  marginBottom: '12px',
                  textAlign: 'left',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '13px' }}
            >
              Verify PIN & Check In
            </button>
          </form>
        )}
      </div>

      {/* Confirmation Bottom Sheet */}
      <ConfirmationSheet
        isOpen={sheetConfig.isOpen}
        onClose={() => setSheetConfig(prev => ({ ...prev, isOpen: false }))}
        type={sheetConfig.type}
        title={sheetConfig.title}
        message={sheetConfig.message}
        details={sheetConfig.details}
        primaryActionText={sheetConfig.primaryActionText}
        onPrimaryAction={sheetConfig.onPrimaryAction}
      />
    </div>
  );
};
