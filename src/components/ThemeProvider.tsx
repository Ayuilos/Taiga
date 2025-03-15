import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

export enum FontSize {
  xs = "0",
  sm = "25",
  md = "50",
  lg = "75",
  xl = "100",
}

export enum FontWeight {
  normal = "1",
  bold = "34",
  extrabold = "67",
  black = "100",
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  themeStorageKey?: string
  fontSizeStorageKey?: string
  fontWeightStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  fontSize: FontSize
  fontWeight: FontWeight
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setFontWeight: (fontWeight: FontWeight) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  fontSize: FontSize.sm,
  fontWeight: FontWeight.normal,
  setTheme: () => null,
  setFontSize: () => null,
  setFontWeight: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  themeStorageKey = "taiga-ui-theme",
  fontSizeStorageKey = "taiga-ui-font-size",
  fontWeightStorageKey = "taiga-ui-font-weight",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(themeStorageKey) as Theme) || defaultTheme
  )
  const [fontSize, setFontSize] = useState<FontSize>(
    () =>
      (localStorage.getItem(fontSizeStorageKey) as FontSize | null) ||
      FontSize.sm
  )
  const [fontWeight, setFontWeight] = useState<FontWeight>(
    () =>
      (localStorage.getItem(fontWeightStorageKey) as FontWeight | null) ||
      FontWeight.normal
  )

  const applyTheme = (theme: Theme) => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        console.log("system theme changed", e.matches ? "dark" : "light")
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange)
    }
  }, [theme])

  useEffect(() => {
    switch (fontSize) {
      case FontSize.xs:
        document.documentElement.style.fontSize = "0.875rem"
        document.documentElement.style.lineHeight = "1.2"
        break
      case FontSize.sm:
        document.documentElement.style.fontSize = "1rem"
        document.documentElement.style.lineHeight = "1.2"
        break
      case FontSize.md:
        document.documentElement.style.fontSize = "1.15rem"
        document.documentElement.style.lineHeight = "1.35"
        break
      case FontSize.lg:
        document.documentElement.style.fontSize = "1.25rem"
        document.documentElement.style.lineHeight = "1.5"
        break
      case FontSize.xl:
        document.documentElement.style.fontSize = "1.5rem"
        document.documentElement.style.lineHeight = "1.5"
        break
    }
  }, [fontSize])

  useEffect(() => {
    switch (fontWeight) {
      case FontWeight.normal:
        document.documentElement.style.fontWeight = "400"
        break
      case FontWeight.bold:
        document.documentElement.style.fontWeight = "600"
        break
      case FontWeight.extrabold:
        document.documentElement.style.fontWeight = "700"
        break
      case FontWeight.black:
        document.documentElement.style.fontWeight = "800"
        break
    }
  }, [fontWeight])

  const value: ThemeProviderState = {
    theme,
    fontSize,
    fontWeight,
    setTheme: (theme: Theme) => {
      localStorage.setItem(themeStorageKey, theme)
      setTheme(theme)
    },
    setFontSize: (fontSize: FontSize) => {
      localStorage.setItem(fontSizeStorageKey, fontSize)
      setFontSize(fontSize)
    },
    setFontWeight: (fontWeight: FontWeight) => {
      localStorage.setItem(fontWeightStorageKey, fontWeight)
      setFontWeight(fontWeight)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
