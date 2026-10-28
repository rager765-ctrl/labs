import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { AlertCircle, ArrowLeft, MapPin, Locate } from 'lucide-react';
import { getDeviceCurrentPosition } from '../../services/geoService';

export const CreateSessionForm: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, updateSession, students, sessions } = useApp();
  const { sessionId } = useParams<{ sessionId: string }>();
  const editingSession = sessions.find(session => session.id === sessionId);

  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('CS302');
  const [labName, setLabName] = useState('Software Engineering Lab');
  const [room, setRoom] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:30');
  const [checkInOffsetMinutes, setCheckInOffsetMinutes] = useState(15);
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(15);
  const [requiresCheckOut, setRequiresCheckOut] = useState(true);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Geofence & Proximity Configuration
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [radiusMeters, setRadiusMeters] = useState<number>(50);
  const [strictEnforcement, setStrictEnforcement] = useState<boolean>(true);
  const [locationName, setLocationName] = useState('Use your device location or enter coordinates');
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [requestingDeviceLocation, setRequestingDeviceLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [deviceAccuracy, setDeviceAccuracy] = useState<number | null>(null);
  const [standaloneMap, setStandaloneMap] = useState(false);

  useEffect(() => {
    if (!editingSession) return;
    const startsAt = new Date(editingSession.startsAt);
    const endsAt = new Date(editingSession.endsAt);
    const toLocalDate = (dateValue: Date) => new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const toLocalTime = (dateValue: Date) => `${String(dateValue.getHours()).padStart(2, '0')}:${String(dateValue.getMinutes()).padStart(2, '0')}`;
    setTitle(editingSession.title);
    setCourseCode(editingSession.courseCode || '');
    setLabName(editingSession.labName);
    setRoom(editingSession.room);
    setDate(toLocalDate(startsAt));
    setStartTime(toLocalTime(startsAt));
    setEndTime(toLocalTime(endsAt));
    setCheckInOffsetMinutes(Math.max(0, Math.round((startsAt.getTime() - new Date(editingSession.checkInOpensAt).getTime()) / 60000)));
    setLateThresholdMinutes(editingSession.lateAfterMinutes);
    setRequiresCheckOut(editingSession.requiresCheckOut);
    setDescription(editingSession.description || '');
    setNotes(editingSession.notes || '');
    setGeofenceEnabled(!!editingSession.geofence?.enabled);
    setLatitude(editingSession.geofence?.latitude || 0);
    setLongitude(editingSession.geofence?.longitude || 0);
    setRadiusMeters(editingSession.geofence?.radiusMeters || 50);
    setStrictEnforcement(editingSession.geofence?.strictEnforcement ?? true);
    setLocationName(editingSession.geofence?.venueName || 'Use your device location or enter coordinates');
  // Initialize the form once the requested session is available from local or cloud state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, editingSession?.id]);

  useEffect(() => {
    if (latitude === 0 && longitude === 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResolvingLocation(true);
      try {
        const query = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude) });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Location lookup failed');
        const result = await response.json();
        setLocationName(result.name || result.address?.amenity || result.address?.building || result.address?.road || result.display_name || 'Selected map location');
      } catch {
        if (!controller.signal.aborted) setLocationName('Selected map location');
      } finally {
        if (!controller.signal.aborted) setResolvingLocation(false);
      }
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [latitude, longitude]);

  // Check for potential room conflict
  const hasRoomConflict = sessions.some(s => {
    const sDate = s.startsAt.split('T')[0];
    return s.id !== editingSession?.id && sDate === date && s.room.toLowerCase() === room.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled';
  });

  const handleRequestDeviceLocation = async () => {
    setRequestingDeviceLocation(true);
    setLocationError('');
    try {
      const position = await getDeviceCurrentPosition();
      setLatitude(position.latitude);
      setLongitude(position.longitude);
      setDeviceAccuracy(position.accuracy);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Could not get device location.');
    } finally {
      setRequestingDeviceLocation(false);
    }
  };

  const openStandaloneMap = (open: boolean) => {
    setStandaloneMap(open);
    if (open && (latitude !== 0 || longitude !== 0)) {
      const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
      window.open(mapUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Session title is required.';
    if (!courseCode.trim()) newErrors.courseCode = 'Course code is required.';
    if (!room.trim()) newErrors.room = 'Lab room is required.';
    if (!date) newErrors.date = 'Date is required.';
    if (!startTime) newErrors.startTime = 'Start time is required.';
    if (!endTime) newErrors.endTime = 'End time is required.';

    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = 'End time must be later than start time.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Construct ISO timestamps
    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
    const endsAt = new Date(`${date}T${endTime}:00`).toISOString();
    const checkInOpenDate = new Date(new Date(startsAt).getTime() - checkInOffsetMinutes * 60000);
    const checkInOpensAt = checkInOpenDate.toISOString();

    const geofence = geofenceEnabled
      ? {
          enabled: true,
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters),
          venueName: locationName,
          strictEnforcement,
        }
      : undefined;

    const sessionData = {
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      labName: labName.trim(),
      room: room.trim(),
      eligibleStudentIds: editingSession?.eligibleStudentIds || students.map(s => s.id),
      startsAt,
      endsAt,
      checkInOpensAt,
      lateAfterMinutes: Number(lateThresholdMinutes),
      requiresCheckOut,
      description: description.trim(),
      notes: notes.trim(),
      geofence,
    };

    if (editingSession) {
      updateSession(editingSession.id, sessionData);
      navigate('/coordinator/sessions');
    } else {
      const created = await createSession(sessionData);
      navigate(`/coordinator/sessions/${created.id}`);
    }
  };

  if (sessionId && !editingSession) {
    return (
      <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
        <CoordinatorNav />
        <main className="coordinator-main">
          <div className="card" style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Session not found</h1>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', marginBottom: '16px' }}>This session may have been deleted or is no longer available to edit.</p>
            <button type="button" className="btn-secondary" onClick={() => navigate('/coordinator/sessions')}>Back to Sessions</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--color-brand-700)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Sessions</span>
        </button>

        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
            {editingSession ? 'Edit Laboratory Session' : 'Schedule New Laboratory Session'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: 0 }}>
              {editingSession ? 'Update the session schedule, venue, attendance rules, and check-in options.' : 'Configure attendance parameters, eligible cohorts, check-in windows, and QR verification options.'}
          </p>
        </div>

        {/* Room Conflict Warning banner */}
        {hasRoomConflict && (
          <div
            style={{
              backgroundColor: 'var(--color-warning-100)',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} color="var(--color-warning-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: 'var(--color-warning-700)' }}>
              <strong>Notice:</strong> Another session is currently scheduled in <strong>{room}</strong> on this date. Double check schedules to prevent overlapping physical lab occupancy.
            </div>
          </div>
        )}

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Title & Course */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Course Code *
              </label>
              <input
                type="text"
                placeholder="e.g. CS302"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${errors.courseCode ? 'var(--color-danger-700)' : 'var(--color-line)'}`,
                  padding: '0 12px',
                  fontSize: '13px',
                }}
              />
              {errors.courseCode && <span style={{ fontSize: '11px', color: 'var(--color-danger-700)' }}>{errors.courseCode}</span>}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Session Title / Practical Topic *
              </label>
              <input
                type="text"
                placeholder="e.g. Microservices & Distributed Caching Practical"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${errors.title ? 'var(--color-danger-700)' : 'var(--color-line)'}`,
                  padding: '0 12px',
                  fontSize: '13px',
                }}
              />
              {errors.title && <span style={{ fontSize: '11px', color: 'var(--color-danger-700)' }}>{errors.title}</span>}
            </div>
          </div>

          {/* Laboratory Name & Room */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Laboratory Facility Name
              </label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-line)',
                  padding: '0 12px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Room / Hall *
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${errors.room ? 'var(--color-danger-700)' : 'var(--color-line)'}`,
                  padding: '0 12px',
                  fontSize: '13px',
                }}
              />
              {errors.room && <span style={{ fontSize: '11px', color: 'var(--color-danger-700)' }}>{errors.room}</span>}
            </div>
          </div>

          {/* Geolocation & Physical Proximity Criteria Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: geofenceEnabled ? 'var(--color-brand-50)' : '#F8FAFC',
              border: '1px solid var(--color-brand-100)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-brand-600)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                    Geolocation & Physical Proximity
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                    Verify students are physically present in the laboratory using GPS hardware
                  </div>
                </div>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-700)' }}>
                  {geofenceEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={geofenceEnabled}
                  onChange={(e) => setGeofenceEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)' }}
                />
              </label>
            </div>

            {geofenceEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                {/* Choose the geofence anchor from this device or coordinates */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Lab Geofence Anchor Point
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestDeviceLocation}
                    disabled={requestingDeviceLocation}
                    className="btn-secondary"
                    style={{ height: '40px', padding: '0 14px', fontSize: '12px', fontWeight: 600, gap: '7px', backgroundColor: '#FFFFFF' }}
                  >
                    <Locate size={15} />
                    <span>{requestingDeviceLocation ? 'Requesting location access…' : 'Use my device location'}</span>
                  </button>
                  {locationError && <div role="alert" style={{ marginTop: '7px', color: 'var(--color-danger-700)', fontSize: '12px' }}>{locationError}</div>}

                </div>

                <div style={{ border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#fff' }}>
                  {latitude !== 0 || longitude !== 0 ? (
                    <iframe
                      title="OpenStreetMap geofence location"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.008}%2C${latitude - 0.005}%2C${longitude + 0.008}%2C${latitude + 0.005}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                      style={{ width: '100%', height: '280px', border: 0, display: 'block' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ height: '120px', display: 'grid', placeItems: 'center', color: 'var(--color-ink-500)', fontSize: '12px' }}>
                      Request your device location or enter coordinates to preview the map.
                    </div>
                  )}
                  <div style={{ padding: '9px 12px', fontSize: '12px', color: 'var(--color-ink-700)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <MapPin size={14} color="var(--color-brand-700)" />
                    <span style={{ flex: 1 }}>
                      <strong>{resolvingLocation ? 'Resolving place name...' : locationName}</strong>
                      {deviceAccuracy !== null && <span> · GPS accuracy ±{deviceAccuracy} m</span>}
                      {' '}| OpenStreetMap
                    </span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={standaloneMap} disabled={latitude === 0 && longitude === 0} onChange={(e) => openStandaloneMap(e.target.checked)} />
                      <span>Open standalone</span>
                    </label>
                  </div>
                </div>

                {/* Coordinate Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-600)', display: 'block', marginBottom: '3px' }}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={latitude}
                      onChange={(e) => {
                        setLatitude(Number(e.target.value));
                        setDeviceAccuracy(null);
                      }}
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-line)',
                        padding: '0 8px',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-600)', display: 'block', marginBottom: '3px' }}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={longitude}
                      onChange={(e) => {
                        setLongitude(Number(e.target.value));
                        setDeviceAccuracy(null);
                      }}
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-line)',
                        padding: '0 8px',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-600)', display: 'block', marginBottom: '3px' }}>
                      Allowed Radius
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={5000}
                      step={5}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(Math.min(5000, Math.max(5, Number(e.target.value))))}
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-line)',
                        padding: '0 8px',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--color-ink-500)' }}>Enter radius in metres (5–5,000)</span>
                  </div>
                </div>

                {/* Strict Enforcement Toggle */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    checked={strictEnforcement}
                    onChange={(e) => setStrictEnforcement(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--color-brand-700)' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                      Strict Geofence Enforcement (Recommended)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                      Rejects check-in attempts if the student's device is beyond {radiusMeters}m from the venue.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Schedule: Date, Start Time, End Time */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${errors.date ? 'var(--color-danger-700)' : 'var(--color-line)'}`,
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              />
              {errors.date && <span style={{ fontSize: '11px', color: 'var(--color-danger-700)' }}>{errors.date}</span>}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${errors.startTime ? 'var(--color-danger-700)' : 'var(--color-line)'}`,
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              />
              {errors.startTime && <span style={{ fontSize: '11px', color: 'var(--color-danger-700)' }}>{errors.startTime}</span>}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${errors.endTime ? 'var(--color-danger-700)' : 'var(--color-line)'}`,
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              />
              {errors.endTime && <span style={{ fontSize: '11px', color: 'var(--color-danger-700)' }}>{errors.endTime}</span>}
            </div>
          </div>

          {/* Attendance Parameters: Check-in Open Offset & Late Threshold */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Check-in Opens Prior to Start
              </label>
              <select
                value={checkInOffsetMinutes}
                onChange={(e) => setCheckInOffsetMinutes(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-line)',
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              >
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before (Recommended)</option>
                <option value={30}>30 minutes before</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Late Arrival Threshold
              </label>
              <select
                value={lateThresholdMinutes}
                onChange={(e) => setLateThresholdMinutes(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-line)',
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              >
                <option value={10}>After 10 minutes from start</option>
                <option value={15}>After 15 minutes from start (Standard)</option>
                <option value={30}>After 30 minutes from start</option>
              </select>
            </div>
          </div>

          {/* Check-out required toggle */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-brand-50)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                Require Student Check-Out
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                Students must scan/tap out before leaving the lab to verify completion.
              </div>
            </div>
            <input
              type="checkbox"
              checked={requiresCheckOut}
              onChange={(e) => setRequiresCheckOut(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--color-brand-700)', cursor: 'pointer' }}
            />
          </div>

          {/* Description & Notes */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Syllabus Objectives & Description
            </label>
            <textarea
              rows={2}
              placeholder="Summary of lab activities, code exercises, or practical equipment to be handled..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                padding: '8px 12px',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Student Instructions / Prerequisites
            </label>
            <input
              type="text"
              placeholder="e.g. Bring university ID and have Node.js v20 installed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                padding: '0 12px',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-line)' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
              style={{ height: '44px', padding: '0 20px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ height: '44px', padding: '0 24px', fontSize: '13px' }}
            >
              {editingSession ? 'Save Session Changes' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
