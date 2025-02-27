import { t } from "@lingui/core/macro"
import { useLocation, useRouter } from "@tanstack/react-router"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SettingsFeatureToggle() {
  const location = useLocation()
  const router = useRouter()

  const providerItemString = t`Providers`
  const modelItemString = t`Default Models`
  const searchApiItemString = t`Search APIs`

  return (
    <Select
      value={location.pathname}
      onValueChange={(path) => {
        router.navigate({
          to: path,
          replace: true,
        })
      }}
    >
      <SelectTrigger className="flex-auto max-w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="/settings">
            {providerItemString}
          </SelectItem>
          <SelectItem value="/settings/manage-default-models">
            {modelItemString}
          </SelectItem>
          <SelectItem value="/settings/manage-search-apis">
            {searchApiItemString}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
