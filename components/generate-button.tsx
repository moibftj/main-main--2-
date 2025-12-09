'use client'

import GenerateLetterButton from './ui/generate-letter-button'

interface GenerateButtonProps {
  loading?: boolean;
  disabled?: boolean;
  hasSubscription?: boolean;
  onClick?: (() => void) | undefined;
  type?: 'button' | 'submit';
  className?: string;
}

/**
 * @deprecated Use GenerateLetterButton from './ui/generate-letter-button' instead
 * This component is kept for backward compatibility
 */
export function GenerateButton({
  loading = false,
  disabled = false,
  hasSubscription = false,
  onClick,
  type = 'button',
  className = ''
}: GenerateButtonProps) {
  return (
    <GenerateLetterButton
      loading={loading}
      disabled={disabled}
      hasSubscription={hasSubscription}
      onClick={onClick}
      type={type}
      className={className}
    />
  )
}

// Re-export the new component as the default
export default GenerateLetterButton