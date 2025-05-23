import { ref, onMounted, onUnmounted, readonly } from 'vue'

export function usePWASafeArea() {
  const safeAreaInsets = ref({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  const isPWA = ref(false)
  const isIOS = ref(false)

  const updateSafeAreaInsets = () => {
    // 检测是否为PWA模式
    isPWA.value = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone ||
                  document.referrer.includes('android-app://')

    // 检测iOS设备
    isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    // 获取安全区域信息
    const computedStyle = getComputedStyle(document.documentElement)
    
    safeAreaInsets.value = {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top')) || 0,
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right')) || 0,
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left')) || 0
    }
  }

  const updateViewportHeight = () => {
    // 修复移动端viewport高度问题
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
    document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight}px`)
  }

  const handleResize = () => {
    updateSafeAreaInsets()
    updateViewportHeight()
  }

  const handleOrientationChange = () => {
    // 延迟处理方向变化，等待浏览器完成重排
    setTimeout(() => {
      updateSafeAreaInsets()
      updateViewportHeight()
    }, 100)
  }

  onMounted(() => {
    updateSafeAreaInsets()
    updateViewportHeight()

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    // 监听显示模式变化
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', updateSafeAreaInsets)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('orientationchange', handleOrientationChange)
  })

  return {
    safeAreaInsets: readonly(safeAreaInsets),
    isPWA: readonly(isPWA),
    isIOS: readonly(isIOS),
    updateSafeAreaInsets,
    updateViewportHeight
  }
} 