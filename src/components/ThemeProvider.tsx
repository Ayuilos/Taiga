import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

export enum FontSize {
  xs = "14px",
  sm = "16px",
  md = "18px",
  lg = "20px",
  xl = "24px",
}

export enum FontWeight {
  light = "200",
  normal = "400",
  bold = "600",
  extrabold = "800",
  black = "900",
}

export const THEME_STORAGE_KEY = "taiga-ui-theme"
export const FONT_SIZE_STORAGE_KEY = "taiga-ui-font-size"
export const FONT_WEIGHT_STORAGE_KEY = "taiga-ui-font-weight"

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
  themeStorageKey = THEME_STORAGE_KEY,
  fontSizeStorageKey = FONT_SIZE_STORAGE_KEY,
  fontWeightStorageKey = FONT_WEIGHT_STORAGE_KEY,
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
    document.documentElement.style.fontSize = fontSize
  }, [fontSize])

  useEffect(() => {
    document.documentElement.style.fontWeight = fontWeight
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
