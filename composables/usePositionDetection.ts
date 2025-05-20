import { ref, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'

interface Position {
  top: number
  left: number
}

type ExpandDirection = 'top' | 'bottom' | 'left' | 'right'

export function usePositionDetection() {
  const position = ref<Position>({ top: 0, left: 0 })
  const expandDirection = ref<ExpandDirection>('bottom')

  const determineExpandDirection = (
    selectorElement: HTMLElement,
    contentElement: HTMLElement
  ): ExpandDirection => {
    const selectorRect = selectorElement.getBoundingClientRect()
    const contentRect = contentElement.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth

    const spaceAbove = selectorRect.top
    const spaceBelow = windowHeight - selectorRect.bottom
    const spaceLeft = selectorRect.left
    const spaceRight = windowWidth - selectorRect.right

    if (spaceBelow >= contentRect.height) {
      return 'bottom'
    } else if (spaceAbove >= contentRect.height) {
      return 'top'
    } else if (spaceRight >= contentRect.width) {
      return 'right'
    } else if (spaceLeft >= contentRect.width) {
      return 'left'
    }

    // 如果所有方向都不够空间，默认选择下方
    return 'bottom'
  }

  const updatePosition = (
    selectorElement: HTMLElement,
    contentElement: HTMLElement
  ) => {
    const direction = determineExpandDirection(selectorElement, contentElement)
    expandDirection.value = direction

    const selectorRect = selectorElement.getBoundingClientRect()
    const contentRect = contentElement.getBoundingClientRect()

    let top = 0
    let left = 0

    switch (direction) {
      case 'bottom':
        top = selectorRect.bottom
        left = selectorRect.left
        break
      case 'top':
        top = selectorRect.top - contentRect.height
        left = selectorRect.left
        break
      case 'right':
        top = selectorRect.top
        left = selectorRect.right
        break
      case 'left':
        top = selectorRect.top
        left = selectorRect.left - contentRect.width
        break
    }

    position.value = { top, left }
  }

  const debouncedUpdatePosition = debounce(updatePosition, 100)

  onMounted(() => {
    window.addEventListener('resize', debouncedUpdatePosition)
    window.addEventListener('scroll', debouncedUpdatePosition)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedUpdatePosition)
    window.removeEventListener('scroll', debouncedUpdatePosition)
  })

  return {
    position,
    expandDirection,
    updatePosition: debouncedUpdatePosition,
  }
}