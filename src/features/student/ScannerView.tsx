import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { X, Flashlight, Camera, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { ConfirmationSheet } from '../../components/common/ConfirmationSheet';
import type { ConfirmationSheetProps } from '../../components/common/ConfirmationSheet';
import { formatTime } from '../../services/storage';

export const ScannerView: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, currentUser, checkInStudent, checkOutStudent, attendanceRecords } = useApp();

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'pin'>('camera');
  const [pinError, setPinError] = useState('');

  // Confirmation sheet state
  const [sheetConfig, setSheetConfig] = useState<Omit<ConfirmationSheetProps, 'isOpen' | 'onClose'> & { isOpen: boolean }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Identify today's active live or primary session
  const activeSession = sessions.find(s => s.status === 'live') || sessions[0];
  const studentRecord = activeSession
    ? attendanceRecords.find(r => r.sessionId === activeSession.id && r.studentId === currentUser.id)
    : undefined;
  const isCheckedIn = studentRecord && (studentRecord.status === 'present' || studentRecord.status === 'late');

  // Request camera on mount if camera tab is active
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) setHasCameraPermission(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setHasCameraPermission(true);
      } catch (err) {
        console.warn('Camera access unavailable or denied', err);
        if (isMounted) setHasCameraPermission(false);
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

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

  const handleSimulateScan = () => {
    if (!activeSession) {
      setSheetConfig({
        isOpen: true,
        type: 'error',
        title: 'No Session Found',
        message: 'No laboratory practical session is active at this time.',
        primaryActionText: 'Back to Dashboard',
        onPrimaryAction: () => navigate('/student'),
      });
      return;
    }

    if (isCheckedIn && !studentRecord?.checkedOutAt && activeSession.requiresCheckOut) {
      // Trigger check out
      const result = checkOutStudent(activeSession.id, currentUser.id);
      setSheetConfig({
        isOpen: true,
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Checked Out Successfully' : 'Check-Out Notice',
        message: result.message,
        details: [
          { label: 'Practical', value: activeSession.title },
          { label: 'Room', value: activeSession.room },
          { label: 'Exit Time', value: formatTime(new Date().toISOString()) },
        ],
        primaryActionText: 'Return to Home',
        onPrimaryAction: () => navigate('/student'),
      });
    } else {
      // Trigger check in
      const result = checkInStudent(activeSession.id, currentUser.id, 'Simulated QR Scan');
      if (result.success) {
        setSheetConfig({
          isOpen: true,
          type: result.code === 'success_late' ? 'warning' : 'success',
          title: result.code === 'success_late' ? 'Recorded Late' : 'Check-In Confirmed',
          message: result.message,
          details: [
            { label: 'Course', value: activeSession.courseCode || 'LAB' },
            { label: 'Session', value: activeSession.title },
            { label: 'Room', value: activeSession.room },
            { label: 'Status', value: result.code === 'success_late' ? 'Late (+20m)' : 'Present on Time' },
            { label: 'Timestamp', value: formatTime(result.record?.checkedInAt || new Date().toISOString()) },
          ],
          primaryActionText: 'View Dashboard',
          onPrimaryAction: () => navigate('/student'),
        });
      } else {
        setSheetConfig({
          isOpen: true,
          type: result.code === 'already_checked_in' ? 'info' : 'error',
          title: result.code === 'already_checked_in' ? 'Already Recorded' : 'Check-In Notice',
          message: result.message,
          primaryActionText: 'Understood',
          onPrimaryAction: () => setSheetConfig(prev => ({ ...prev, isOpen: false })),
        });
      }
    }
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
      setPinError(`Incorrect PIN. (Coordinator demo PIN is ${activeSession.pin})`);
      return;
    }

    // Success via PIN
    const result = checkInStudent(activeSession.id, currentUser.id, 'Session PIN');
    if (result.success) {
      setSheetConfig({
        isOpen: true,
        type: 'success',
        title: 'PIN Verified — Check-In Recorded',
        message: 'Your attendance was successfully verified via laboratory coordinator PIN.',
        details: [
          { label: 'Practical', value: activeSession.title },
          { label: 'Method', value: `PIN Verification (#${pinInput.trim()})` },
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
        backgroundColor: 'var(--color-scan-surface)',
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
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate('/student')}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
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
          <span style={{ fontSize: '11px', color: '#E2E8F0', opacity: 0.85 }}>
            {activeSession ? activeSession.courseCode || 'Laboratory' : 'Check In'}
          </span>
        </div>

        <button
          onClick={toggleTorch}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: torchOn ? '#FFFFFF' : 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: torchOn ? 'var(--color-ink-900)' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          aria-label="Toggle flashlight"
        >
          <Flashlight size={18} />
        </button>
      </div>

      {/* Mode Tabs: Camera Scan vs Enter PIN */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '4px 16px',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            padding: '3px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
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
            <span>QR Scanner</span>
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

      {/* Main View Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {activeTab === 'camera' ? (
          <>
            {/* Camera Video or Fallback Container */}
            <div
              style={{
                position: 'relative',
                width: 'min(68vw, 280px)',
                height: 'min(68vw, 280px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              {/* Actual Video Element */}
              {hasCameraPermission ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    textAlign: 'center',
                    gap: '8px',
                  }}
                >
                  <Camera size={32} color="#94A3B8" />
                  <span style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: '15px' }}>
                    Camera preview ready. Use the demo scan trigger below to verify instantly.
                  </span>
                </div>
              )}

              {/* Four Bright White Corner Brackets */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                }}
              >
                {/* Top Left */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderTop: '4px solid #FFFFFF', borderLeft: '4px solid #FFFFFF', borderTopLeftRadius: '8px' }} />
                {/* Top Right */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '28px', height: '28px', borderTop: '4px solid #FFFFFF', borderRight: '4px solid #FFFFFF', borderTopRightRadius: '8px' }} />
                {/* Bottom Left */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '28px', height: '28px', borderBottom: '4px solid #FFFFFF', borderLeft: '4px solid #FFFFFF', borderBottomLeftRadius: '8px' }} />
                {/* Bottom Right */}
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderBottom: '4px solid #FFFFFF', borderRight: '4px solid #FFFFFF', borderBottomRightRadius: '8px' }} />

                {/* Animated Laser Scan Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '8px',
                    right: '8px',
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
                marginTop: '28px',
                textAlign: 'center',
                maxWidth: '280px',
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
                Align the laboratory session QR code within the frame to check in.
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
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  <span>Active Session: <strong>{activeSession.title.substring(0, 26)}...</strong></span>
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
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
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

            {activeSession?.pin && (
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#94A3B8' }}>
                Coordinator demo PIN: <strong style={{ color: '#F8FAFC' }}>{activeSession.pin}</strong>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Bottom Sticky Action Area with Simulate Scan Button */}
      <div
        style={{
          padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px)) 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleSimulateScan}
          className="btn-primary"
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#FFFFFF',
            color: 'var(--color-brand-700)',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          <Sparkles size={18} color="var(--color-brand-700)" />
          <span>Simulate Scan ({isCheckedIn ? 'Check Out' : 'Check In'})</span>
        </button>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#CBD5E1' }}>
          Simulates authentic student camera QR decode for prototype testing.
        </div>
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
