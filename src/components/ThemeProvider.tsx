import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { convertFileSrc } from "@tauri-apps/api/core"
import { appDataDir } from "@tauri-apps/api/path"
import {
  BaseDirectory,
  create,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs"
import { uniqBy } from "lodash-es"
import { z } from "zod"

import { addCSSLinkTag } from "@/lib/utils"

type Theme = "dark" | "light" | "system"

export const customThemeCSSSchema = z.object({
  name: z.string(),
  css: z.string(),
  preset: z.boolean().optional(),
})
export type CustomThemeCSS = z.infer<typeof customThemeCSSSchema>

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
export const CUSTOM_THEME_CSS_NAME_STORAGE_KEY = "taiga-ui-custom-theme-css-name"
export const FONT_SIZE_STORAGE_KEY = "taiga-ui-font-size"
export const FONT_WEIGHT_STORAGE_KEY = "taiga-ui-font-weight"

// Put preset themes at `public/preset-themes`
const PRESET_THEMES = ["taiga"]

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  themeStorageKey?: string
  customThemeCSSNameStorageKey?: string
  fontSizeStorageKey?: string
  fontWeightStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  customThemeCSSName: string
  customThemeCSSs: CustomThemeCSS[]
  fontSize: FontSize
  fontWeight: FontWeight
  setTheme: (theme: Theme) => void
  setCustomThemeCSSName: (themeName: string) => void
  setFontSize: (fontSize: FontSize) => void
  setFontWeight: (fontWeight: FontWeight) => void
  addCustomThemeCSS: () => void
  modifyCustomThemeCSS: (originName: string, themeCSS: CustomThemeCSS) => void
  deleteCustomThemeCSS: (themeName: string) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  customThemeCSSName: "default",
  customThemeCSSs: [],
  fontSize: FontSize.sm,
  fontWeight: FontWeight.normal,
  setTheme: () => null,
  setCustomThemeCSSName: () => null,
  setFontSize: () => null,
  setFontWeight: () => null,
  addCustomThemeCSS: () => null,
  modifyCustomThemeCSS: () => null,
  deleteCustomThemeCSS: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  themeStorageKey = THEME_STORAGE_KEY,
  customThemeCSSNameStorageKey = CUSTOM_THEME_CSS_NAME_STORAGE_KEY,
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

  const [customThemeCSSName, setCustomThemeCSSName] = useState<string>(
    () => localStorage.getItem(customThemeCSSNameStorageKey) || "default"
  )
  const [presetThemeCSSs, setPresetThemeCSSs] = useState<CustomThemeCSS[]>([
    { name: "default", css: "", preset: true },
  ])
  const [customThemeCSSs, setCustomThemeCSSs] = useState<CustomThemeCSS[]>([])

  const allCustomThemeCSSs = useMemo(
    () => [...presetThemeCSSs, ...customThemeCSSs],
    [presetThemeCSSs, customThemeCSSs]
  )

  const applyCustomThemeCSSName = useCallback(
    async (themeName: string) => {
      setCustomThemeCSSName(themeName)
      const dataKey = THEME_STORAGE_KEY.replace(/-/g, "")

      document.head.querySelectorAll("link").forEach((link) => {
        if (link.dataset[dataKey]) {
          link.remove()
        }
      })
      if (themeName !== "default") {
        const customThemeCss = allCustomThemeCSSs.find(
          (css) => css.name === themeName
        )
        const appDataPath = await appDataDir()

        if (customThemeCss) {
          addCSSLinkTag(
            customThemeCss.preset
              ? `/preset-themes/${themeName}.css`
              : convertFileSrc(`${appDataPath}/themes/${themeName}.css`),
            { [dataKey]: themeName }
          )
        }
      }
    },
    [allCustomThemeCSSs]
  )

  const addCustomThemeCSS = async () => {
    const name = `New-${new Date().getTime()}`
    const file = await create(`themes/${name}.css`, {
      baseDir: BaseDirectory.AppData,
    })
    const data = new TextEncoder().encode("/* New Theme CSS */")
    await file.write(data)
    await file.close()

    await loadCustomThemeCSSs()
    setCustomThemeCSSName(name)
  }

  const modifyCustomThemeCSS = async (
    originName: string,
    css: CustomThemeCSS
  ) => {
    if (originName !== css.name) {
      await rename(`themes/${originName}.css`, `themes/${css.name}.css`, {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData,
      })
    }

    await writeTextFile(`themes/${css.name}.css`, css.css, {
      baseDir: BaseDirectory.AppData,
    })
    await loadCustomThemeCSSs()
    setCustomThemeCSSName(css.name)

    // Remove link tag and re-add it
    document.head.querySelector(`link[href="themes/${css.name}.css"]`)?.remove()
    addCSSLinkTag(`/preset-themes/${css.name}.css`)
  }

  const deleteCustomThemeCSS = async (themeName: string) => {
    await remove(`themes/${themeName}.css`, {
      baseDir: BaseDirectory.AppData,
    })
    loadCustomThemeCSSs()
    applyCustomThemeCSSName("default")
  }

  const loadPresetThemeCSSs = useCallback(async () => {
    const presetThemeCSSs = PRESET_THEMES.map(async (preset) => {
      const cssString = await fetch(`/preset-themes/${preset}.css`).then(
        (res) => res.text()
      )

      return {
        name: preset,
        css: cssString,
        preset: true,
      } as CustomThemeCSS
    })

    Promise.all(presetThemeCSSs).then((presets) =>
      setPresetThemeCSSs((_css) => uniqBy([..._css, ...presets], "name"))
    )
  }, [])

  const loadCustomThemeCSSs = useCallback(async () => {
    const themeDirExist = await exists("themes", {
      baseDir: BaseDirectory.AppData,
    })
    if (!themeDirExist) {
      await mkdir("themes", { baseDir: BaseDirectory.AppData })
    }

    const entries = await readDir("themes", {
      baseDir: BaseDirectory.AppData,
    })

    const cThemes = await Promise.all(
      entries
        .filter((entry) => entry.name.endsWith(".css"))
        .map(async (entry) => {
          const name = entry.name.replace(".css", "")
          const css = await readTextFile(`themes/${entry.name}`, {
            baseDir: BaseDirectory.AppData,
          })

          return {
            name,
            css,
          }
        })
    )

    setCustomThemeCSSs(cThemes)
  }, [])

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
    loadPresetThemeCSSs()
  }, [loadPresetThemeCSSs])

  useEffect(() => {
    loadCustomThemeCSSs()
  }, [loadCustomThemeCSSs])

  useEffect(() => {
    applyCustomThemeCSSName(customThemeCSSName)
  }, [applyCustomThemeCSSName, customThemeCSSName])

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
    customThemeCSSName,
    customThemeCSSs: allCustomThemeCSSs,
    fontSize,
    fontWeight,
    setTheme: (theme: Theme) => {
      localStorage.setItem(themeStorageKey, theme)
      setTheme(theme)
    },
    setCustomThemeCSSName: (themeCSSName: string) => {
      localStorage.setItem(customThemeCSSNameStorageKey, themeCSSName)
      applyCustomThemeCSSName(themeCSSName)
    },
    setFontSize: (fontSize: FontSize) => {
      localStorage.setItem(fontSizeStorageKey, fontSize)
      setFontSize(fontSize)
    },
    setFontWeight: (fontWeight: FontWeight) => {
      localStorage.setItem(fontWeightStorageKey, fontWeight)
      setFontWeight(fontWeight)
    },
    addCustomThemeCSS,
    deleteCustomThemeCSS,
    modifyCustomThemeCSS,
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
