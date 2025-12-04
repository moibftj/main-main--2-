'use client'

interface GenerateButtonProps {
  loading?: boolean;
  disabled?: boolean;
  hasSubscription?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export function GenerateButton({
  loading = false,
  disabled = false,
  hasSubscription = false,
  onClick,
  type = 'button',
  className = ''
}: GenerateButtonProps) {
  const buttonText = loading
    ? 'Generating...'
    : hasSubscription
      ? 'Generate Letter'
      : 'Subscribe to Generate';

  return (
    <button
      type={type}
      className={`generate-letter-btn ${className}`}
      onClick={onClick}
      disabled={loading || disabled}
    >
      <span className="btn-text">{buttonText}</span>
      <span className="btn-icon">
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
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </span>
    </button>
  )
}