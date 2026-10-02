import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand" end>
          Flight Planner
        </NavLink>
      </div>
    </nav>
  )
}

export default Navbar
