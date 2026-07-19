import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { seedDB } from './services/db';
import { Login } from './views/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { History } from './views/History';
import { Statistics } from './views/Statistics';
import { Settings } from './views/Settings';
import { ProductForm } from './views/ProductForm';
import { StockAdjustments } from './views/StockAdjustments';
import { RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: appLoading, refreshData } = useApp();
  const [currentView, setView] = useState('dashboard');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [dbSeeded, setDbSeeded] = useState(false);

  // Seed DB on startup
  useEffect(() => {
    const seed = async () => {
      try {
        await seedDB();
        setDbSeeded(true);
        // Refresh data to load seeded configs into context
        await refreshData();
      } catch (err) {
        console.error('Error seeding DB:', err);
        setDbSeeded(true); // Proceed anyway to avoid locking
      }
    };
    seed();
  }, []);

  const handleEditProduct = (id: string) => {
    setEditingProductId(id);
    setOpenAddModal(true);
  };

  const handleCloseForm = () => {
    setOpenAddModal(false);
    setEditingProductId(null);
  };

  // 1. Loading States
  if (authLoading || appLoading || !dbSeeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-[#FF1744] mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-350">Cargando base de datos local...</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">PedidosYa Control de Vencimientos</p>
        </div>
      </div>
    );
  }

  // 2. Auth Guard
  if (!user) {
    return <Login />;
  }

  // 3. Main Views router
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard setView={setView} onEditProduct={handleEditProduct} />;
      case 'history':
        return <History onEditProduct={handleEditProduct} />;
      case 'stats':
        return <Statistics />;
      case 'adjustments':
        return <StockAdjustments />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setView={setView} onEditProduct={handleEditProduct} />;
    }
  };

  return (
    <>
      <Layout 
        currentView={currentView} 
        setView={setView} 
        onOpenAddModal={() => {
          setEditingProductId(null);
          setOpenAddModal(true);
        }}
      >
        {renderView()}
      </Layout>

      {/* Global Product entry and modification form */}
      <ProductForm 
        isOpen={openAddModal} 
        onClose={handleCloseForm} 
        productIdToEdit={editingProductId} 
      />
    </>
  );
};
export default App;
