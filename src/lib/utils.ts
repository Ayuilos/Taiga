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

export function sameArrays(arr1: any[], arr2: any[]) {
  if (arr1.length !== arr2.length) {
    return false
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }

  return true
}