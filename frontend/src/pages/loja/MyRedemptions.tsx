import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MyRedemptionsContent from '@/components/loja/MyRedemptionsContent';
import { PointsStoreProps } from '@/types/products';

/**
 * Componente da página de histórico de resgates
 * Exibe todos os resgates realizados pelo usuário
 */
const MyRedemptions: React.FC<PointsStoreProps> = ({ linkLoja }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 via-purple-700 to-teal-600 shadow-lg border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(linkLoja)}
                className="flex items-center text-white hover:text-yellow-300 transition-all transform hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar à loja
              </button>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-xl font-bold text-white">Meus Resgates</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MyRedemptionsContent showHeader={false} linkLoja={linkLoja} showStats={true} />
      </main>
    </div>
  );
};

export default MyRedemptions;