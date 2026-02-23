export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

let loadPromise = null

export function loadPaystackInline() {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve(window.PaystackPop)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v2/inline.js'
    script.async = true
    script.onload = () => resolve(window.PaystackPop)
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load Paystack'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
