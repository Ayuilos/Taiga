import { useCallback, useEffect, useState } from "react"
import { Button } from "./ui/button"
import { ArrowDown } from "lucide-react"

interface IScrollToBottom {
  observedRef: React.RefObject<HTMLElement | null>
  onClick?: () => void
}
export const SHOULD_RENDER_SCROLL_TO_BOTTOM_HEIGHT = 8
export function ScrollToBottom({ observedRef, onClick }: IScrollToBottom) {
  const getShouldRender = useCallback(
    () =>
      observedRef.current
        ? Math.abs(
            observedRef.current.scrollHeight -
              observedRef.current.scrollTop -
              observedRef.current.clientHeight
          ) > SHOULD_RENDER_SCROLL_TO_BOTTOM_HEIGHT
        : false,
    [observedRef]
  )

  const [shouldRender, setShouldRender] = useState(getShouldRender)

  const scrollToBottom = useCallback(() => {
    if (observedRef.current) {
      const newScrollTop =
        observedRef.current.scrollHeight - observedRef.current.clientHeight

      observedRef.current.scrollTop = newScrollTop
    }
    if (onClick) onClick()
  }, [observedRef, onClick])

  useEffect(() => {
    if (observedRef.current) {
      const observedElement = observedRef.current as HTMLElement

      const handleScroll = () => {
        setShouldRender(getShouldRender())
      }

      const observer = new ResizeObserver(handleScroll)
      observer.observe(observedElement)

      const throttledHandleScroll = () => {
        requestAnimationFrame(handleScroll)
      }

      observedElement.addEventListener("scroll", throttledHandleScroll)
      return () => {
        observer.disconnect()
        observedElement.removeEventListener("scroll", throttledHandleScroll)
      }
    }
  }, [observedRef, getShouldRender])

  if (!shouldRender) {
    return null
  }

  return (
    <Button
      className="absolute w-10 h-10 bottom-4 right-0 rounded-full"
      size="icon"
      variant="secondary"
      onClick={scrollToBottom}
    >
      <ArrowDown />
    </Button>
  )
}
