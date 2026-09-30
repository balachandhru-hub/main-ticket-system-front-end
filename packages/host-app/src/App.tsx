import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

// Lazy-loaded microfrontend components
const AuthApp = React.lazy(() => import('remoteAuth/AuthApp'));

const App: React.FC = () => {

  return (
    <BrowserRouter>
      <React.Suspense fallback={<div className="loader-container">
        <div className='loader'></div>
      </div>}>
        <Routes>
          {/* Auth routes (login/register) */}
          <Route path="/*" element={<AuthApp />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};

export default App;
