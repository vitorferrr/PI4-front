import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
