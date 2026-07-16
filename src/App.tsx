import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { Home } from './pages/home';
import { App as InternalApp } from './pages/app/Plataforma';
import { LoginModal } from './components/Auth/LoginModal';
import { AppLayout } from './layouts/App/AppLayout';
//import { ProtectedRoute } from './routes/ProtectedRoutes';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <Routes>
        {/* Rota Pública */}
        <Route path="/" element={<Home onOpenLogin={() => setIsLoginOpen(true)} />} />
        
        {/* Rota Protegida */}
        <Route 
          path="/app" 
          element={<AppLayout/>}
/*             <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute> */
          
        >
          <Route index element={<InternalApp />} />
        </Route>
      </Routes>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
      />
    </>
  );
}

export default App;