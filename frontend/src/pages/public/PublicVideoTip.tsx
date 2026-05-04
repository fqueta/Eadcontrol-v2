import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { videoTipsService } from '@/services/videoTipsService';
import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, AlertCircle, Play, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * PublicVideoTip
 * pt-BR: Visualização pública de uma dica em vídeo via token.
 * en-US: Public view of a video tip via token.
 */
export default function PublicVideoTip() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const { data: tip, isLoading, error } = useQuery({
    queryKey: ['public', 'video-tip', token],
    queryFn: () => videoTipsService.getPublicTipByToken(token!),
    enabled: !!token,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  function renderVideo() {
    if (!tip?.embed_url) return null;

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
        <iframe
          src={tip.embed_url}
          className="absolute inset-0 w-full h-full border-none"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={tip.title}
        />
      </div>
    );
  }

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl min-h-[60vh]">
        {/* Breadcrumb / Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')} 
          className="mb-8 hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar para o início
        </Button>

        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-96 bg-slate-100 rounded-2xl w-full" />
            <div className="h-8 bg-slate-100 rounded w-1/2" />
            <div className="h-20 bg-slate-100 rounded w-full" />
          </div>
        ) : error || !tip ? (
          <Card className="border-dashed border-red-200 bg-red-50/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-16 h-16 text-red-300 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800">Vídeo indisponível</h2>
              <p className="text-slate-500 mt-2 max-w-md">
                O link que você acessou pode ter expirado ou o vídeo foi removido. 
                Entre em contato com o suporte se precisar de ajuda.
              </p>
              <Button onClick={() => navigate('/')} className="mt-8 bg-slate-800 hover:bg-slate-900">
                Ir para página inicial
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Player Section */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              {renderVideo()}
            </div>

            {/* Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Play className="w-5 h-5 text-violet-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                  {tip.title}
                </h1>
              </div>
              
              {tip.description && (
                <div className="prose prose-slate max-w-none">
                  <div className="text-lg text-slate-600 leading-relaxed bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-slate-100 shadow-sm">
                    {tip.description}
                  </div>
                </div>
              )}

              {/* Extras / Metadata */}
              <div className="flex flex-wrap items-center gap-4 pt-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  <Video className="w-4 h-4" />
                  {tip.provider === 'youtube' ? 'YouTube' : tip.provider === 'vimeo' ? 'Vimeo' : 'Player'}
                </span>
                <span className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  Dica de conteúdo
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </InclusiveSiteLayout>
  );
}
