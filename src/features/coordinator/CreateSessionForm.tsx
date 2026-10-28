import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const CreateSessionForm: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, students, sessions } = useApp();

  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('CS302');
  const [labName, setLabName] = useState('Software Engineering Lab');
  const [room, setRoom] = useState('Room 304B, Turing Hall');
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

  // Check for potential room conflict
  const hasRoomConflict = sessions.some(s => {
    const sDate = s.startsAt.split('T')[0];
    return sDate === date && s.room.toLowerCase() === room.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled';
  });

  const handleSubmit = (e: React.FormEvent) => {
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

    const created = createSession({
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      labName: labName.trim(),
      room: room.trim(),
      eligibleStudentIds: students.map(s => s.id),
      startsAt,
      endsAt,
      checkInOpensAt,
      lateAfterMinutes: Number(lateThresholdMinutes),
      requiresCheckOut,
      description: description.trim(),
      notes: notes.trim(),
    });

    navigate(`/coordinator/sessions/${created.id}`);
  };

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
            Schedule New Laboratory Session
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: 0 }}>
            Configure attendance parameters, eligible cohorts, check-in windows, and QR verification options.
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
              Schedule Session
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
