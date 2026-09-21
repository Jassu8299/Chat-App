import { useState, React } from 'react'
import Login from './pages/user-login/Login'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router'

function App() {
  return (
      <Router>
        <Routes>
          <Route path='/user-login' element={<Login />} />
        </Routes>
      </Router>
  )
}

export default App
