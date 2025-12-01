import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import LetterTypeSelector from '@/components/letter/letter-type-selector'

describe('LetterTypeSelector', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const letterTypes = [
    {
      id: 'demand-letter',
      title: 'Demand Letter',
      description: 'Formal demand for payment or action',
      icon: 'FileText'
    },
    {
      id: 'cease-desist',
      title: 'Cease and Desist',
      description: 'Order to stop illegal activity',
      icon: 'Shield'
    },
    {
      id: 'notice-to-vacate',
      title: 'Notice to Vacate',
      description: 'Legal notice to vacate property',
      icon: 'Home'
    }
  ]

  it('should render all letter types', () => {
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
      />
    )

    expect(screen.getByText('Demand Letter')).toBeInTheDocument()
    expect(screen.getByText('Cease and Desist')).toBeInTheDocument()
    expect(screen.getByText('Notice to Vacate')).toBeInTheDocument()

    // Check descriptions
    expect(screen.getByText('Formal demand for payment or action')).toBeInTheDocument()
    expect(screen.getByText('Order to stop illegal activity')).toBeInTheDocument()
    expect(screen.getByText('Legal notice to vacate property')).toBeInTheDocument()
  })

  it('should handle letter type selection', async () => {
    const user = userEvent.setup()
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
      />
    )

    const demandLetterCard = screen.getByText('Demand Letter').closest('div')
    await user.click(demandLetterCard!)

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'demand-letter',
      title: 'Demand Letter',
      description: 'Formal demand for payment or action',
      icon: 'FileText'
    })
  })

  it('should show selected state', async () => {
    const user = userEvent.setup()
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
        selectedId="cease-desist"
      />
    )

    // The selected card should have a different style
    const ceaseDesistCard = screen.getByText('Cease and Desist').closest('[data-state="selected"]')
    expect(ceaseDesistCard).toBeInTheDocument()
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
      />
    )

    const firstCard = screen.getByText('Demand Letter').closest('div')
    firstCard?.focus()
    await user.keyboard('{Enter}')

    expect(mockOnSelect).toHaveBeenCalledWith(letterTypes[0])
  })

  it('should have proper ARIA labels', () => {
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
      />
    )

    const cards = screen.getAllByRole('button')
    cards.forEach((card, index) => {
      expect(card).toHaveAttribute('aria-label')
      expect(card).toHaveAttribute('aria-describedby')
    })
  })

  it('should handle disabled state', () => {
    render(
      <LetterTypeSelector
        letterTypes={letterTypes.map(type => ({ ...type, disabled: type.id === 'cease-desist' }))}
        onSelect={mockOnSelect}
      />
    )

    const ceaseDesistCard = screen.getByText('Cease and Desist').closest('div')
    expect(ceaseDesistCard).toHaveAttribute('aria-disabled', 'true')
  })

  it('should show loading state', () => {
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
        loading={true}
      />
    )

    expect(screen.getByText('Loading letter types...')).toBeInTheDocument()
  })

  it('should show error state', () => {
    render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
        error="Failed to load letter types"
      />
    )

    expect(screen.getByText('Failed to load letter types')).toBeInTheDocument()
  })

  it('should support custom className', () => {
    const { container } = render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
        className="custom-selector-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-selector-class')
  })

  it('should render custom number of columns', () => {
    const { container } = render(
      <LetterTypeSelector
        letterTypes={letterTypes}
        onSelect={mockOnSelect}
        columns={2}
      />
    )

    const gridContainer = container.querySelector('[style*="grid-template-columns"]')
    expect(gridContainer).toBeInTheDocument()
  })

  it('should not call onSelect when clicking disabled card', async () => {
    const user = userEvent.setup()
    render(
      <LetterTypeSelector
        letterTypes={letterTypes.map(type => ({ ...type, disabled: type.id === 'cease-desist' }))}
        onSelect={mockOnSelect}
      />
    )

    const ceaseDesistCard = screen.getByText('Cease and Desist').closest('div')
    await user.click(ceaseDesistCard!)

    expect(mockOnSelect).not.toHaveBeenCalled()
  })
})