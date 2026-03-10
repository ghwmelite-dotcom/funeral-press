export function haptic(type = 'light') {
  if (!navigator.vibrate) return
  switch (type) {
    case 'light': navigator.vibrate(10); break
    case 'medium': navigator.vibrate(20); break
    case 'heavy': navigator.vibrate(30); break
    case 'success': navigator.vibrate([10, 50, 10]); break
    case 'error': navigator.vibrate([30, 50, 30]); break
  }
}
