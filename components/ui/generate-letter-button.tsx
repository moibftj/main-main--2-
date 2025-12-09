'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import styles from './generate-letter-button.module.css'

interface GenerateLetterButtonProps {
  loading?: boolean;
  disabled?: boolean;
  hasSubscription?: boolean;
  onClick?: (() => void) | undefined;
  type?: 'button' | 'submit';
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}

export function GenerateLetterButton({
  loading = false,
  disabled = false,
  hasSubscription = false,
  onClick,
  type = 'button',
  className = '',
  children,
  'aria-label': ariaLabel
}: GenerateLetterButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Default text content if children not provided
  const buttonText = loading
    ? 'Generating...'
    : hasSubscription
      ? 'Generate Letter'
      : 'Subscribe to Generate';

  // Intersection Observer for performance optimization
  useEffect(() => {
    if (!buttonRef.current) return;

    // Create Intersection Observer to pause animations when not visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '50px' // Start slightly before visible
      }
    );

    observerRef.current.observe(buttonRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Page Visibility API to pause animations when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    // Add event listener with passive option for better performance
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Optimized click handler
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      event.preventDefault();
      return;
    }

    // Add haptic feedback for touch devices if available
    if ('vibrate' in navigator && window.matchMedia('(pointer: coarse)').matches) {
      navigator.vibrate(50); // Short vibration
    }

    onClick?.();
  }, [loading, disabled, onClick]);

  // Determine if animations should be paused
  const shouldPauseAnimation = !isVisible || !isPageVisible;

  // Compute CSS classes
  const cssClasses = [
    styles.button,
    loading ? styles.loading : '',
    shouldPauseAnimation ? styles.animationPaused : '',
    className
  ].filter(Boolean).join(' ');

  // Generate accessible label
  const accessibilityLabel = ariaLabel || buttonText;

  return (
    <button
      ref={buttonRef}
      type={type}
      className={cssClasses}
      onClick={handleClick}
      disabled={loading || disabled}
      aria-label={accessibilityLabel}
      aria-disabled={loading || disabled}
      aria-busy={loading}
      data-loading={loading}
      data-disabled={disabled}
      data-optimization="performance"
    >
      <span className={styles.btnText}>
        {children || buttonText}
      </span>
      <span
        className={styles.btnIcon}
        aria-hidden="true"
      >
        {loading ? (
          // Loading spinner icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        ) : (
          // Arrow right icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </span>
    </button>
  );
}

// Export the component as default for easier importing
export default GenerateLetterButton;

// Re-export with a more specific name for potential future variants
export { GenerateLetterButton as OptimizedGenerateLetterButton };