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

export function ModelManagementFeatureToggle() {
  const location = useLocation()
  const router = useRouter()

  const providerItemString = t`Providers`
  const modelItemString = t`Default Models`

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
          <SelectItem value="/model-management">
            {providerItemString}
          </SelectItem>
          <SelectItem value="/model-management/manage-default-models">
            {modelItemString}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
