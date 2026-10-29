import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import './styles/gameFonts'
import './index.css'
import './i18n'; // Import i18n config
import theme from './theme'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>
)
