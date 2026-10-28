import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './onboarding.css';

export const ONBOARDING_COMPLETED_KEY = 'labattend_has_seen_onboarding_v1';

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  primaryImage: string;
  secondaryImage: string;
  badgeText: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'geofence',
    title: 'Geofenced Presence Check',
    description:
      'Verify arrivals at Innovations Lab meeting locations with real-time device location checks.',
    primaryImage: '/images/onboarding/geofence.jpg',
    secondaryImage: '/images/onboarding/qr-scan.jpg',
    badgeText: 'GPS Proximity',
  },
  {
    id: 'qr-scan',
    title: 'Instant QR & PIN Access',
    description:
      'Scan a meeting QR code or enter its PIN to record your arrival without a manual sign-in sheet.',
    primaryImage: '/images/onboarding/qr-scan.jpg',
    secondaryImage: '/images/onboarding/metrics.jpg',
    badgeText: 'Live Scanner',
  },
  {
    id: 'metrics',
    title: 'Live Visit Tracking',
    description:
      'Track who arrives and leaves, review attendance history, and see coordinator updates in real time.',
    primaryImage: '/images/onboarding/metrics.jpg',
    secondaryImage: '/images/onboarding/geofence.jpg',
    badgeText: 'Cloud Metrics',
  },
];

interface OnboardingScreenProps {
  forceShow?: boolean;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ forceShow = false }) => {
  const navigate = useNavigate();
  const { currentUser, currentRole } = useApp();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSlide = SLIDES[currentSlideIndex];
  const isLastSlide = currentSlideIndex === SLIDES.length - 1;

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    if (forceShow && window.history.length > 2) {
      navigate(-1);
      return;
    }
    if (currentUser) {
      navigate(currentRole === 'coordinator' ? '/coordinator' : '/student', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      setCurrentSlideIndex(prev => Math.min(prev + 1, SLIDES.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLastSlide]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 50) {
      // Swiped left -> Next
      handleNext();
    } else if (diff < -50) {
      // Swiped right -> Prev
      handlePrev();
    }
    setTouchStartX(null);
  };

  return (
    <div className="onboarding-viewport">
      {/* Decorative desktop background ambient text */}
      <div className="onboarding-bg-text onboarding-bg-text--top" aria-hidden="true">
        LAB ATTEND
      </div>
      <div className="onboarding-bg-text onboarding-bg-text--bottom" aria-hidden="true">
        PRESENCE SYSTEM
      </div>

      {/* Walkthrough content */}
      <div
        className="onboarding-panel"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide Visual Imagery Area */}
        <div className="onboarding-visual">
          {/* Pastel Organic Mint Shape Backdrop */}
          <div className="onboarding-backdrop-shape" />

          {/* Layered Photo Cards */}
          <div className="onboarding-cards-stage">
            {/* Secondary Tilted Card (Behind) */}
            <div
              className={`onboarding-card onboarding-card--secondary onboarding-card--anim-${currentSlideIndex}`}
            >
              <img
                src={currentSlide.secondaryImage}
                alt=""
                className="onboarding-card__img"
                loading="lazy"
              />
            </div>

            {/* Primary Front Card */}
            <div
              className={`onboarding-card onboarding-card--primary onboarding-card--anim-${currentSlideIndex}`}
            >
              <img
                src={currentSlide.primaryImage}
                alt={currentSlide.title}
                className="onboarding-card__img"
              />
              <span className="onboarding-card__badge">{currentSlide.badgeText}</span>
            </div>
          </div>
        </div>

        {/* Slide Text Content & Pagination */}
        <div className="onboarding-content">
          {/* Pagination Pills */}
          <div className="onboarding-pagination" role="tablist" aria-label="Slides">
            {SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={idx === currentSlideIndex}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`onboarding-dot ${idx === currentSlideIndex ? 'onboarding-dot--active' : ''}`}
              />
            ))}
          </div>

          {/* Title & Description with crossfade */}
          <div className="onboarding-text-block">
            <h2 className="onboarding-title">{currentSlide.title}</h2>
            <p className="onboarding-description">{currentSlide.description}</p>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="onboarding-footer">
          {/* Skip Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="onboarding-btn-skip"
            id="onboarding-skip"
          >
            Skip
          </button>

          {/* Circular Next Button / Get Started */}
          {isLastSlide ? (
            <button
              type="button"
              onClick={handleFinish}
              className="onboarding-btn-finish"
              id="onboarding-finish"
            >
              <span>Get Started</span>
              <Check size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="onboarding-btn-next-wrap"
              aria-label="Next slide"
              id="onboarding-next"
            >
              {/* Outer circular tracking ring matching reference */}
              <div className="onboarding-ring">
                <svg className="onboarding-ring__svg" viewBox="0 0 54 54">
                  <circle
                    className="onboarding-ring__bg"
                    cx="27"
                    cy="27"
                    r="24"
                    fill="none"
                    strokeWidth="2"
                  />
                  <circle
                    className="onboarding-ring__progress"
                    cx="27"
                    cy="27"
                    r="24"
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray="150.8"
                    strokeDashoffset={150.8 - (150.8 * (currentSlideIndex + 1)) / SLIDES.length}
                  />
                </svg>
                <div className="onboarding-btn-next">
                  <ArrowRight size={20} strokeWidth={2.5} />
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
