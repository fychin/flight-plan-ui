import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import FlightPlans from './pages/FlightPlans'
import FlightPlanDetails from './pages/FlightPlanDetails'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<FlightPlans />} />
        <Route path="/flight-plan/:id" element={<FlightPlanDetails />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
