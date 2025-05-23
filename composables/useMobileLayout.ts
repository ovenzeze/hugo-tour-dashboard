import { computed } from 'vue'

/**
 * 移动端布局高度计算 Composable
 * 提供考虑导航栏高度的正确移动端视窗高度
 */
export const useMobileLayout = () => {
  const MOBILE_HEADER_HEIGHT = '4rem' // 64px

  // 移动端可用高度计算
  const mobileContentHeight = computed(() => {
    return `calc(100svh - ${MOBILE_HEADER_HEIGHT})`
  })

  // 带安全区域的移动端可用高度计算
  const mobileContentHeightWithSafeArea = computed(() => {
    return `calc(100svh - ${MOBILE_HEADER_HEIGHT} - env(safe-area-inset-top, 0px))`
  })

  // 检测是否为移动端
  const isMobile = computed(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  // CSS类名
  const mobileFullHeightClass = 'mobile-full-height'

  return {
    MOBILE_HEADER_HEIGHT,
    mobileContentHeight,
    mobileContentHeightWithSafeArea,
    isMobile,
    mobileFullHeightClass
  }
} 