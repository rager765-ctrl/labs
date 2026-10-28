import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, PlusCircle, BarChart3, User, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CoordinatorNav: React.FC = () => {
  const { currentUser } = useApp();

  const links = [
    { to: '/coordinator', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/coordinator/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/coordinator/sessions/new', label: 'New Session', icon: PlusCircle },
    { to: '/coordinator/reports', label: 'Reports', icon: BarChart3 },
    { to: '/coordinator/profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside
        className="coordinator-desktop-sidebar"
        style={{
          width: '240px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--color-line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 30,
        }}
      >
        <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--color-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-brand-700)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                Lab Portal
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-brand-600)', fontWeight: 600 }}>
                COORDINATOR CONSOLE
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-brand-700)' : 'var(--color-ink-700)',
                backgroundColor: isActive ? 'var(--color-brand-100)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card at Bottom */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid var(--color-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand-100)',
                color: 'var(--color-brand-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                overflow: 'hidden',
              }}
            >
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name || 'Coordinator'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (currentUser?.name || 'EV').split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name || 'Coordinator'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.level || 'Faculty'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (hidden on desktop via CSS) */}
      <nav
        className="coordinator-mobile-nav"
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
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minWidth: '56px',
              height: '48px',
              textDecoration: 'none',
              color: isActive ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            })}
          >
            {({ isActive }) => (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '24px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isActive ? 'var(--color-brand-100)' : 'transparent',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 500 }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
};
