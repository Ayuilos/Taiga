import { getRelativeTime } from "@/lib/relative-time"
import { memo, useEffect, useState } from "react"

interface IRelativeTime {
  defaultOn?: boolean
  autoRefresh?: boolean
  date: number | string
}
function UnMemoizedRelativeTime({
  date,
  defaultOn = true,
  autoRefresh = true,
}: IRelativeTime) {
  const dateObj = new Date(date)
  const [isRelative, setIsRelative] = useState(defaultOn)
  // Use bit calculate to trigger re-render to bring the lowest cost
  // Too low bits is risky which may not trigger re-render under some situation
  const [bits, setBits] = useState(0b000)

  useEffect(() => {
    if (autoRefresh && isRelative) {
      setTimeout(() => setBits((b) => (b + 0b001) & 0b111), 1000)
    }
  }, [bits, autoRefresh, isRelative])

  return (
    <span onClick={() => setIsRelative((r) => !r)}>
      {isRelative ? getRelativeTime(dateObj) : dateObj.toLocaleString()}
    </span>
  )
}
export const RelativeTime = memo(UnMemoizedRelativeTime)
