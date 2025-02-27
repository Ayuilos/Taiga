import { createContext, PropsWithChildren, useCallback, useState } from "react"

import { SearchApiStore, TBaseSearchAPI } from "@/lib/search-api-store"

type TSearchApisContextType = ReturnType<typeof useSearchApisContext>
export const SearchApisContext = createContext<TSearchApisContextType>({
  searchApis: [],
  fetchSearchApis: async () => [],
  setSearchApi: async () => {},
})

export function SearchApisContextProvider({ children }: PropsWithChildren) {
  const context = useSearchApisContext()

  return (
    <SearchApisContext.Provider value={context}>
      {children}
    </SearchApisContext.Provider>
  )
}

function useSearchApisContext() {
  const [searchApis, setSearchApis] = useState<TBaseSearchAPI[]>([])

  const fetchSearchApis = useCallback(async () => {
    const _searchAPIs = await SearchApiStore.getAllSearchApis()

    setSearchApis(_searchAPIs)

    return _searchAPIs
  }, [])

  const setSearchApi = useCallback(
    async (api: TBaseSearchAPI) => {
      await SearchApiStore.setSearchApi(api)
      await fetchSearchApis()
    },
    [fetchSearchApis]
  )

  return {
    searchApis,
    fetchSearchApis,
    setSearchApi,
  }
}
