import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { i18n } from "@lingui/core"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function dynamicActivate(locale: string) {
  const { messages } = await import(`../locales/${locale}/messages.po`)

  i18n.load(locale, messages)
  i18n.activate(locale)
}

export function stringifyObject(ob: any) {
  return JSON.stringify(ob, null, 2)
}

export function diffStringArrays(
  oldArray: string[],
  newArray: string[]
): { added: string[]; removed: string[] } {
  const added = newArray.filter((item) => !oldArray.includes(item))
  const removed = oldArray.filter((item) => !newArray.includes(item))

  return { added, removed }
}
