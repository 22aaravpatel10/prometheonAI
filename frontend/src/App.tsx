import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Scheduler from './pages/Scheduler';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import RecipeLibrary from './pages/RecipeLibrary';
import BatchExecution from './pages/BatchExecution';
import DigitalTwin from './pages/DigitalTwin';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recipes" element={<RecipeLibrary />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/digital-twin" element={<DigitalTwin />} />
            <Route path="/users" element={<Users />} />
            <Route path="/batches/:id/execute" element={<BatchExecution />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;