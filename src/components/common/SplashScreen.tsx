import React from 'react';
import { BrandMark } from './BrandMark';
import './splash.css';

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'Connecting to LabAttend...',
}) => {
  return (
    <div className="splash-screen" role="status" aria-live="polite">
      <div className="splash-screen__content">
        {/* Brand Icon with glowing ring */}
        <div className="splash-screen__icon-wrap">
          <div className="splash-screen__pulse-ring" />
          <div className="splash-screen__icon">
            <BrandMark size={44} />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <h1 className="splash-screen__title">LabAttend</h1>
        <p className="splash-screen__subtitle">University Laboratory Attendance</p>

        {/* 3 Loading Dots */}
        <div className="splash-screen__dots" aria-label="Loading">
          <span className="splash-screen__dot" />
          <span className="splash-screen__dot" />
          <span className="splash-screen__dot" />
        </div>

        {/* Optional status message */}
        {message && <div className="splash-screen__message">{message}</div>}
      </div>

      <div className="splash-screen__footer">
        <span>Geolocation & Practical Verification BaaS</span>
      </div>
    </div>
  );
};
