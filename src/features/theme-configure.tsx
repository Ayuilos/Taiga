import { FontSize, FontWeight, useTheme } from "@/components/ThemeProvider"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export function ThemeConfigure() {
  const { fontSize, fontWeight, setFontSize, setFontWeight } = useTheme()

  const exampleText = "~Taiga is a chatbot~"

  const fontSizeId = "TaigaFontSize"
  const fontWeightId = "TaigaFontWeight"

  return (
    <div className="flex flex-col gap-4 w-[80%]">
      <div className="border rounded-lg my-8 p-8 text-center w-full">
        {exampleText}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fontSizeId}>Font Size</Label>
        <Slider
          id={fontSizeId}
          defaultValue={[Number(fontSize)]}
          max={100}
          step={25}
          onValueChange={(value) => {
            setFontSize(String(value[0]) as FontSize)
          }}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fontWeightId}>Font Weight</Label>
        <Slider
          id={fontWeightId}
          defaultValue={[Number(fontWeight)]}
          max={100}
          step={33}
          onValueChange={(value) => {
            setFontWeight(String(value[0]) as FontWeight)
          }}
          className="w-full"
        />
      </div>
    </div>
  )
}
