import React from 'react';
import { BrandMark } from './BrandMark';
import './splash.css';
import splashBackground from '../../../image.png';

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'Connecting to LabAttend...',
}) => {
  return (
    <div className="splash-screen" role="status" aria-live="polite">
      <div
        className="splash-screen__backdrop"
        style={{ backgroundImage: `url("${splashBackground}")` }}
        aria-hidden="true"
      />
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
        <p className="splash-screen__subtitle">Innovations Lab Visit Tracking</p>

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
        <span>Arrival & Departure Tracking</span>
      </div>
    </div>
  );
};
