import {
  createContext,
  PropsWithChildren,
  useCallback,
  useState,
} from "react"

import { SearchApiStore, TBaseSearchAPI } from "@/lib/search-api-store"

const getDefaultSearchApi = () => {
  return {
    name: "jina",
    searchURL: "https://s.jina.ai/",
    apiKey: "",
  } as TBaseSearchAPI
}

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

    // [NOTICE] This is a temporary solution when default search API is not set
    if (_searchAPIs.length === 0) {
      const defaultApi = getDefaultSearchApi()
      setSearchApis([defaultApi])
      await SearchApiStore.setSearchApi(defaultApi)
    } else {
      setSearchApis(_searchAPIs)
    }

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
