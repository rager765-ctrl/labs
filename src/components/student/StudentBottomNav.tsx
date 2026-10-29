import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, History, User, ScanLine } from 'lucide-react';

export const StudentBottomNav: React.FC = () => {
  return (
    <nav
      className="mobile-nav-dock student-nav-dock"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(var(--size-nav) + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px env(safe-area-inset-bottom, 0px)',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          justifyContent: 'space-around',
          margin: '0 auto',
        }}
      >
        <NavLink
          className="nav-dock-item"
          to="/student"
          end
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minWidth: '64px',
            height: '48px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            transition: 'all 0.15s ease',
          })}
        >
          {({ isActive }) => (
            <>
              <div className="nav-dock-icon"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '26px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: isActive ? 'var(--color-brand-100)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Home size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 500 }}>Home</span>
            </>
          )}
        </NavLink>

        <NavLink
          className="nav-dock-item"
          to="/student/scan"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minWidth: '64px',
            height: '48px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            transition: 'all 0.15s ease',
          })}
        >
          {({ isActive }) => (
            <>
              <div className="nav-dock-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '26px', borderRadius: 'var(--radius-pill)', backgroundColor: isActive ? 'var(--color-brand-100)' : 'transparent', transition: 'background-color 0.15s ease' }}>
                <ScanLine size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 500 }}>Scan</span>
            </>
          )}
        </NavLink>

        <NavLink
          className="nav-dock-item"
          to="/student/history"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minWidth: '64px',
            height: '48px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            transition: 'all 0.15s ease',
          })}
        >
          {({ isActive }) => (
            <>
              <div className="nav-dock-icon"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '26px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: isActive ? 'var(--color-brand-100)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <History size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 500 }}>History</span>
            </>
          )}
        </NavLink>

        <NavLink
          className="nav-dock-item"
          to="/student/profile"
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            minWidth: '64px',
            height: '48px',
            textDecoration: 'none',
            color: isActive ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            transition: 'all 0.15s ease',
          })}
        >
          {({ isActive }) => (
            <>
              <div className="nav-dock-icon"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '26px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: isActive ? 'var(--color-brand-100)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <User size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 500 }}>Profile</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};



