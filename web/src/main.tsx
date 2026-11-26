import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/barlow-condensed/900.css'
import './index.css'
import App from './App'
import { QueryClientProvider } from '@tanstack/react-query'
import { initializeSession, onSessionChange } from './lib/session'
import { queryClient } from './lib/queryClient'
import { useNovaVisitaStore } from './store/novaVisitaStore'

const unsubscribeSession = onSessionChange(() => {
  void queryClient.cancelQueries()
  queryClient.clear()
  useNovaVisitaStore.getState().limparSelecao()
})

const disposeSession = initializeSession()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeSession()
    unsubscribeSession()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
