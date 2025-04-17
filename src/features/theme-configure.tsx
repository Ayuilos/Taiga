import { useCallback, useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { t } from "@lingui/core/macro"
import { produce } from "immer"
import { Check, ChevronDown, Plus } from "lucide-react"
import { useForm } from "react-hook-form"

import {
  CustomThemeCSS,
  customThemeCSSSchema,
  FontSize,
  FontWeight,
  useTheme,
} from "@/components/ThemeProvider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { NavigationDescription } from "@/components/NavigationDescription"

export function ThemeConfigure() {
  const {
    fontSize,
    fontWeight,
    customThemeCSSName,
    customThemeCSSs,
    setFontSize,
    setFontWeight,
    setCustomThemeCSSName,
    addCustomThemeCSS,
    deleteCustomThemeCSS,
    modifyCustomThemeCSS,
  } = useTheme()

  const exampleText = "~Taiga is a chatbot~"

  const fontSizeId = "TaigaFontSize"
  const fontWeightId = "TaigaFontWeight"
  const customThemeId = "TaigaCustomTheme"

  const fontSizeString = t`Font Size`
  const fontWeightString = t`Font Weight`
  const customThemeString = t`Custom Theme`

  const currentCustomThemeCSS = customThemeCSSs.find(
    (css) => css.name === customThemeCSSName
  )

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
      <div className="flex flex-col gap-2">
        <Label htmlFor={customThemeId}>{customThemeString}</Label>
        <CustomThemeCSSManagement
          customThemeCSSs={customThemeCSSs}
          currentCustomThemeCSS={currentCustomThemeCSS}
          setCustomThemeCSSName={setCustomThemeCSSName}
          addCustomThemeCSS={addCustomThemeCSS}
          deleteCustomThemeCSS={deleteCustomThemeCSS}
          modifyCustomThemeCSS={modifyCustomThemeCSS}
        />
      </div>
    </div>
  )
}

interface ICustomThemeCSSManagement {
  currentCustomThemeCSS?: CustomThemeCSS
  customThemeCSSs: CustomThemeCSS[]
  setCustomThemeCSSName: (name: string) => void
  addCustomThemeCSS: () => void
  modifyCustomThemeCSS: (originName: string, css: CustomThemeCSS) => void
  deleteCustomThemeCSS: (name: string) => void
}
function CustomThemeCSSManagement({
  currentCustomThemeCSS,
  customThemeCSSs,
  setCustomThemeCSSName,
  addCustomThemeCSS,
  modifyCustomThemeCSS,
  deleteCustomThemeCSS,
}: ICustomThemeCSSManagement) {
  const [showSelect, setShowSelect] = useState(false)

  const customThemeCSSNameDuplicatedString = t`Custom theme name already exists`
  const form = useForm<CustomThemeCSS>({
    context: { customThemeCSSs, currentCustomThemeCSS },
    resolver: async (
      data,
      context: {
        customThemeCSSs: CustomThemeCSS[]
        currentCustomThemeCSS: CustomThemeCSS
      },
      options
    ) =>
      zodResolver(
        customThemeCSSSchema.refine(
          ({ name }) =>
            // The `resolver` function will be cached, provide dependencies in `context`.
            // Refer to https://www.react-hook-form.com/api/useform/#resolver Rules#2
            {
              const _customThemeCSSs = context.customThemeCSSs

              return _customThemeCSSs.every(
                (p) =>
                  context.currentCustomThemeCSS.name === p.name ||
                  name !== p.name
              )
            },
          {
            message: customThemeCSSNameDuplicatedString,
            path: ["name"],
          }
        )
      )(data, context, options),
    defaultValues: {
      name: currentCustomThemeCSS?.name || "",
      css: currentCustomThemeCSS?.css || "",
      preset: currentCustomThemeCSS?.preset || false,
    },
  })

  const pendingValues = form.watch()

  const onSubmit = useCallback(
    (values: CustomThemeCSS) => {
      modifyCustomThemeCSS(currentCustomThemeCSS!.name, values)
    },
    [currentCustomThemeCSS, modifyCustomThemeCSS]
  )

  const cancelChange = useCallback(() => {
    form.reset()
  }, [form])

  const onCustomThemeCSSChange = useCallback(
    (name: string) => {
      const customThemeCSS = customThemeCSSs.find((_p) => _p.name === name)!

      setCustomThemeCSSName(customThemeCSS.name)
    },
    [customThemeCSSs, setCustomThemeCSSName]
  )

  const customThemeCSSItems = useMemo(() => {
    const { preset, custom } = produce(customThemeCSSs, (draft) =>
      draft.sort((a, b) =>
        a.name === currentCustomThemeCSS?.name
          ? -1
          : b.name === currentCustomThemeCSS?.name
            ? 1
            : a.name.localeCompare(b.name)
      )
    ).reduce<{
      preset: CustomThemeCSS[]
      custom: CustomThemeCSS[]
    }>(
      (classified, curr) => {
        if (curr.preset) classified.preset.push(curr)
        else classified.custom.push(curr)

        return classified
      },
      { preset: [], custom: [] }
    )

    const presetString = t`Preset`
    const customString = t`Custom`

    const mapFunc = (customThemeCSS: CustomThemeCSS) => {
      const selected = currentCustomThemeCSS?.name === customThemeCSS.name

      return (
        <CommandItem
          className="flex items-center justify-between"
          key={customThemeCSS.name}
          value={customThemeCSS.name}
          onSelect={() => {
            setShowSelect(false)
            onCustomThemeCSSChange(customThemeCSS.name)
          }}
        >
          <span>{customThemeCSS.name}</span>
          {selected ? <Check /> : null}
        </CommandItem>
      )
    }

    return (
      <CommandList>
        <CommandGroup heading={presetString}>
          {preset.map(mapFunc)}
        </CommandGroup>
        <CommandGroup heading={customString}>
          {custom.map(mapFunc)}
        </CommandGroup>
      </CommandList>
    )
  }, [customThemeCSSs, currentCustomThemeCSS?.name, onCustomThemeCSSChange])

  useEffect(() => {
    form.reset(currentCustomThemeCSS)
  }, [form, currentCustomThemeCSS])

  const customThemeCSSSearchString = t`Search Custom Theme CSS...`
  const noCustomThemeCSSEmptyString = t`No Custom Theme CSS found`
  const nameLabelString = t`Name`
  const cssLabelString = t`CSS`
  const cssLabelPlaceholderString = t`Paste CSS code from tweakcn at here`
  const submitButtonString = t`Confirm`
  const cancelButtonString = t`Cancel`
  const deleteCustomThemeCSSButtonString = t`Delete Custom Theme CSS`
  const deleteCustomThemeCSSDialogTitleString = t`Are you sure you want to delete this theme CSS?`
  const deleteCustomThemeCSSDialogCancelString = t`Cancel`
  const deleteCustomThemeCSSDialogConfirmString = t`Delete`

  return (
    <div className="w-[92%] flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          className="w-full flex gap-2 justify-between"
          onClick={() => setShowSelect(true)}
        >
          <span className="flex-auto text-start truncate">
            {currentCustomThemeCSS?.name}
          </span>
          <ChevronDown />
        </Button>
        <CommandDialog open={showSelect} onOpenChange={setShowSelect}>
          <Command value={currentCustomThemeCSS?.name}>
            <CommandInput placeholder={customThemeCSSSearchString} />
            <CommandEmpty>{noCustomThemeCSSEmptyString}</CommandEmpty>
            {customThemeCSSItems}
          </Command>
        </CommandDialog>
        <Button
          className="aspect-square"
          size="icon"
          onClick={addCustomThemeCSS}
        >
          <Plus />
        </Button>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="name"
            disabled={pendingValues.preset}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{nameLabelString}</FormLabel>
                <FormControl>
                  <Input placeholder={nameLabelString} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="css"
            disabled={pendingValues.preset}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{cssLabelString}</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none max-h-[30vh] transition-all"
                    placeholder={cssLabelPlaceholderString}
                    {...field}
                  />
                </FormControl>
                <NavigationDescription providerName="" type="customize_theme" />
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.isDirty && (
            <>
              <Button type="submit">{submitButtonString}</Button>
              <Button type="button" variant="secondary" onClick={cancelChange}>
                {cancelButtonString}
              </Button>
            </>
          )}
          {customThemeCSSs.length > 1 && !pendingValues.preset ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  {deleteCustomThemeCSSButtonString}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {deleteCustomThemeCSSDialogTitleString}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {deleteCustomThemeCSSDialogCancelString}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      deleteCustomThemeCSS(currentCustomThemeCSS!.name)
                    }}
                  >
                    {deleteCustomThemeCSSDialogConfirmString}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </form>
      </Form>
    </div>
  )
}
