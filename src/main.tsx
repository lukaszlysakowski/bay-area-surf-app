import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import './index.css'
import App from './App'

const DAY = 1000 * 60 * 60 * 24

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

// Persist the query cache to localStorage so tide predictions survive reloads
// and NOAA outages. Tide predictions are astronomical/deterministic, so cached
// values stay valid across the forecast window.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'surf-query-cache',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 30 * DAY,
        buster: 'v1', // bump to invalidate all persisted data after schema changes
        dehydrateOptions: {
          // Only persist tide queries that succeeded and target a concrete
          // date (YYYYMMDD). The "today"/"now" view uses a 'today' literal key
          // and must always refetch live, or a reload on a new day would show
          // yesterday's tides. Real-time buoy/weather data is never persisted.
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' &&
            query.queryKey[0] === 'tides' &&
            typeof query.queryKey[2] === 'string' &&
            /^\d{8}$/.test(query.queryKey[2]),
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
