import { FontSize, FontWeight, useTheme } from "@/components/ThemeProvider"
import { Label } from "@/components/ui/label"
import { Toggle } from "@/components/ui/toggle"
import { t } from "@lingui/core/macro"

export function ThemeConfigure() {
  const { fontSize, fontWeight, setFontSize, setFontWeight } = useTheme()

  const exampleText = "~Taiga is a chatbot~"

  const fontSizeId = "TaigaFontSize"
  const fontWeightId = "TaigaFontWeight"

  const fontSizeString = t`Font Size`
  const fontWeightString = t`Font Weight`

  return (
    <div className="flex flex-col gap-4 w-[80%]">
      <div className="border rounded-lg my-8 p-8 text-center w-full">
        {exampleText}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fontSizeId}>{fontSizeString}</Label>
        <div className="flex gap-2 justify-center items-center">
          {Object.entries(FontSize).map(([key, value]) => (
            <Toggle
              key={key}
              pressed={fontSize === value}
              style={{ fontSize: value }}
              onPressedChange={() => setFontSize(value)}
            >
              A
            </Toggle>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fontWeightId}>{fontWeightString}</Label>
        <div className="flex gap-2 justify-center items-center">
          {Object.entries(FontWeight).map(([key, value]) => (
            <Toggle
              key={key}
              pressed={fontWeight === value}
              style={{ fontWeight: value }}
              onPressedChange={() => setFontWeight(value)}
            >
              B
            </Toggle>
          ))}
        </div>
      </div>
    </div>
  )
}
