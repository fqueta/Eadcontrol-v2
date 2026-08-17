import { createRoot } from 'react-dom/client'
import { unstable_batchedUpdates } from 'react-dom'
import { notifyManager } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

// O @tanstack/react-query v5.90 passou a notificar via setTimeout(0) sem
// envolver o React, o que pode disparar "dispatcher is null" em componentes
// Radix re-renderizados fora do ciclo normal do React. Restauramos o batching
// via unstable_batchedUpdates para notificações seguras dentro do React.
notifyManager.setBatchNotifyFunction((callback) => {
  unstable_batchedUpdates(callback)
})

// A limpeza de service workers é feita no index.html (síncrono, antes dos bundles)
createRoot(document.getElementById("root")!).render(<App />);
