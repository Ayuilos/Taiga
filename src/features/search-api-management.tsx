import { useContext, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, X } from "lucide-react"
import { useForm } from "react-hook-form"

import { SearchApiSchema, TBaseSearchAPI } from "@/lib/search-api-store"
import { NavigationDescription } from "@/components/NavigationDescription"
import { SearchApisContext } from "@/components/SearchApisContext"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PRESET_NAMES } from "@/lib/updater"

interface IInternalSearchAPIManagement {
  apis: TBaseSearchAPI[]
  changeApi: (api: TBaseSearchAPI) => Promise<void>
}

function InternalSearchAPIManagement({
  apis,
  changeApi,
}: IInternalSearchAPIManagement) {
  return (
    <div className="w-[94%] flex flex-col gap-2">
      {apis.map((api) => {
        return (
          <SingleSearchAPIManagement
            key={api.name}
            api={api}
            onAPIChange={changeApi}
          />
        )
      })}
    </div>
  )
}

interface ISingleSearchAPIManagement {
  api: TBaseSearchAPI
  onAPIChange: (api: TBaseSearchAPI) => void
}
function SingleSearchAPIManagement({
  api,
  onAPIChange,
}: ISingleSearchAPIManagement) {
  const form = useForm<TBaseSearchAPI>({
    resolver: zodResolver(SearchApiSchema),
    defaultValues: api,
  })

  const onSubmit = async (values: TBaseSearchAPI) => {
    await onAPIChange(values)

    form.reset(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          disabled
          render={({ field }) => (
            <FormItem>
              <FormLabel>{field.name}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="searchURL"
          disabled={api.name !== PRESET_NAMES.SEARXNG_PRESET}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
              <NavigationDescription
                providerName={api.name}
                type="search_api_url"
              />
            </FormItem>
          )}
        />
        {api.apiKey !== undefined ? (
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API KEY</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
                <NavigationDescription
                  providerName={api.name}
                  type="search_api_key"
                />
              </FormItem>
            )}
          />
        ) : null}

        {form.formState.isDirty ? (
          <div className="flex items-center gap-2">
            <Button type="submit">
              <Check />
            </Button>
            <Button
              type="button"
              onClick={() => {
                form.reset()
              }}
            >
              <X />
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  )
}

export function SearchAPIManagement() {
  const { searchApis, fetchSearchApis, setSearchApi } =
    useContext(SearchApisContext)

  useEffect(() => {
    fetchSearchApis()
  }, [fetchSearchApis])

  return (
    <InternalSearchAPIManagement apis={searchApis} changeApi={setSearchApi} />
  )
}
