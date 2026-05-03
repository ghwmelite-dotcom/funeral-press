import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { OtpCodeInput } from '../OtpCodeInput'

describe('OtpCodeInput', () => {
  it('renders 6 digit boxes by default', () => {
    const { getAllByRole } = render(<OtpCodeInput value="" onChange={() => {}} />)
    expect(getAllByRole('textbox')).toHaveLength(6)
  })

  it('respects custom length prop', () => {
    const { getAllByRole } = render(<OtpCodeInput value="" onChange={() => {}} length={4} />)
    expect(getAllByRole('textbox')).toHaveLength(4)
  })

  it('calls onChange with concatenated digits as user types', () => {
    const onChange = vi.fn()
    const { getByLabelText } = render(<OtpCodeInput value="" onChange={onChange} />)
    fireEvent.change(getByLabelText('Digit 1'), { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('strips non-digits from typed input', () => {
    const onChange = vi.fn()
    const { getByLabelText } = render(<OtpCodeInput value="" onChange={onChange} />)
    fireEvent.change(getByLabelText('Digit 1'), { target: { value: 'a' } })
    // Non-digit results in empty/space which gets trimmed
    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(/^\d*$/.test(lastCall)).toBe(true)
  })

  it('handles paste of full code', () => {
    const onChange = vi.fn()
    const { container } = render(<OtpCodeInput value="" onChange={onChange} />)
    const wrapper = container.firstChild
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true })
    pasteEvent.clipboardData = {
      getData: () => '123456',
    }
    fireEvent(wrapper, pasteEvent)
    expect(onChange).toHaveBeenCalledWith('123456')
  })

  it('disables inputs when disabled prop is true', () => {
    const { getAllByRole } = render(<OtpCodeInput value="" onChange={() => {}} disabled />)
    getAllByRole('textbox').forEach(input => {
      expect(input.disabled).toBe(true)
    })
  })
})
