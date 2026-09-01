import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AccountDetail from './pages/AccountDetail';
import DemoHighlights from './pages/DemoHighlights';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/account/:accountId" element={<AccountDetail />} />
      <Route path="/demo" element={<DemoHighlights />} />
      {/* Fallbacks */}
      <Route path="/account" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}