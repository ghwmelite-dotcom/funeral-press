import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { PhoneInput } from '../PhoneInput'

describe('PhoneInput', () => {
  it('renders country dropdown and phone input', () => {
    const { getByLabelText } = render(
      <PhoneInput value="" onChange={() => {}} country="GH" onCountryChange={() => {}} />
    )
    expect(getByLabelText('Country')).toBeTruthy()
    expect(getByLabelText('Phone number')).toBeTruthy()
  })

  it('strips non-digit characters from typed input', () => {
    const onChange = vi.fn()
    const { getByLabelText } = render(
      <PhoneInput value="" onChange={onChange} country="GH" onCountryChange={() => {}} />
    )
    fireEvent.change(getByLabelText('Phone number'), { target: { value: 'abc241234567xyz' } })
    // The displayed value should only have the digits
    expect(getByLabelText('Phone number').value).toBe('241234567')
  })

  it('calls onCountryChange when country dropdown changes', () => {
    const onCountryChange = vi.fn()
    const { getByLabelText } = render(
      <PhoneInput value="" onChange={() => {}} country="GH" onCountryChange={onCountryChange} />
    )
    fireEvent.change(getByLabelText('Country'), { target: { value: 'US' } })
    expect(onCountryChange).toHaveBeenCalledWith('US')
  })

  it('calls onChange with E.164 formatted number when input is valid', () => {
    const onChange = vi.fn()
    const { getByLabelText } = render(
      <PhoneInput value="" onChange={onChange} country="GH" onCountryChange={() => {}} />
    )
    // Ghana mobile number — should parse to +233...
    fireEvent.change(getByLabelText('Phone number'), { target: { value: '241234567' } })
    // onChange is called multiple times during typing; the last call with valid number should have +233...
    const calls = onChange.mock.calls.map(c => c[0])
    expect(calls.some(v => v.startsWith('+233'))).toBe(true)
  })
})
