import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ConsoleApp from './console/ConsoleApp'
import './index.css'

function Root() {
  const [route] = React.useState(window.location.hash)
  const [showConsole, setShowConsole] = React.useState(route === '#/console')

  React.useEffect(() => {
    const onHash = () => setShowConsole(window.location.hash === '#/console')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return showConsole ? <ConsoleApp /> : <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
