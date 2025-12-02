import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Progress from './pages/Progress';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;