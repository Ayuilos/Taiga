import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

export function getRelativeTime(date: Date) {
  const targetDate = dayjs(date)

  return targetDate.fromNow()
}
