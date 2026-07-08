import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// A limpeza de service workers é feita no index.html (síncrono, antes dos bundles)
createRoot(document.getElementById("root")!).render(<App />);
