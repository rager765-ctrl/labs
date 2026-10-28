import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, History, User } from 'lucide-react';

export const StudentBottomNav: React.FC = () => {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(var(--size-nav) + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'var(--color-surface)',
        borderTop: 'var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 40,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: 'var(--layout-content-max)',
          justifyContent: 'space-around',
          margin: '0 auto',
        }}
      >
        <NavLink
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
              <div
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
              <div
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
              <div
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
