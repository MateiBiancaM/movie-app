import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import theme from '../theme.js'
import Home from './pages/Home.jsx'
import Movies from './pages/movies/Movies.jsx'
import Shows from './pages/shows/Shows.jsx'
import Search from './pages/search/Search.jsx'
import DetailsPage from './pages/DetailsPage.jsx'
import { AuthProvider } from './context/authProvider.jsx'
import WatchList from './pages/WatchList.jsx'
import Protected from './components/routes/Protected.jsx'
import Watched from './pages/Watched.jsx'
import WatchedEdit from './pages/WatchedEdit.jsx'
import ConsumptionHabits from './pages/ConsumptionHabits.jsx'
import FinancialReports from './pages/FinancialReports.jsx'

localStorage.setItem('chakra-ui-color-mode', 'dark')

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/movies",
        element: <Movies />,
      },
      {
        path: "/shows",
        element: <Shows />,
      },
      {
        path: "/:type/:id",
        element: <DetailsPage />,
      },
      {
        path: "/watched",
        element: <Protected><Watched/></Protected>,
      },
      {
        path: "/watched/:id/edit",
        element: <Protected><WatchedEdit/></Protected>,
      },
      {
        path: "/watchlist",
        element: <Protected><WatchList/></Protected>,
      }, 
      {
        path: "/financial",
        element: <Protected><FinancialReports/></Protected>,
      },
      {
        path: "/consumption",
        element: <Protected><ConsumptionHabits/></Protected>,
      },
      {
        path: "/recommendations",
        element: <Protected><div>Recommendations</div></Protected>,
      },
      {
        path: "/search",
        element: <Search />,
      },

    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeScript initialColorMode="dark" />
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ChakraProvider>
  </StrictMode>,
)
