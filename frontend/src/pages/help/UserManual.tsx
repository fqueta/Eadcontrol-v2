import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Palette, 
  Layout, 
  Menu as MenuIcon, 
  MousePointer, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  GraduationCap
} from 'lucide-react';

export default function UserManual() {
  const [activeTab, setActiveTab] = useState('layout');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            Central de Ajuda & Manual de Uso
          </h1>
          <p className="text-muted-foreground mt-1">
            Guia completo de recursos visuais, customizações de banners, menus e seções de destaque.
          </p>
        </div>
        <div className="text-xs uppercase tracking-widest font-black bg-primary/15 text-primary px-3 py-1.5 rounded-full border border-primary/20 self-start">
          Versão 2.1 • Atualizado
        </div>
      </div>

      {/* Manual Tabs layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left Nav menu - Mobile Friendly */}
        <div className="md:col-span-1 space-y-2">
          <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground px-2 mb-2">Seções do Guia</div>
          <div className="flex flex-row md:flex-col overflow-x-auto gap-1 md:overflow-x-visible pb-2 md:pb-0">
            <Button
              variant={activeTab === 'layout' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('layout')}
              className={`justify-start gap-2 text-xs md:text-sm font-semibold whitespace-nowrap w-full ${activeTab === 'layout' ? 'bg-primary text-white' : ''}`}
            >
              <Palette className="h-4 w-4" />
              Estilo & Bordas
            </Button>
            <Button
              variant={activeTab === 'banners' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('banners')}
              className={`justify-start gap-2 text-xs md:text-sm font-semibold whitespace-nowrap w-full ${activeTab === 'banners' ? 'bg-primary text-white' : ''}`}
            >
              <Layout className="h-4 w-4" />
              Banners do Site
            </Button>
            <Button
              variant={activeTab === 'menus' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('menus')}
              className={`justify-start gap-2 text-xs md:text-sm font-semibold whitespace-nowrap w-full ${activeTab === 'menus' ? 'bg-primary text-white' : ''}`}
            >
              <MenuIcon className="h-4 w-4" />
              Menu do Topo
            </Button>
            <Button
              variant={activeTab === 'cta' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('cta')}
              className={`justify-start gap-2 text-xs md:text-sm font-semibold whitespace-nowrap w-full ${activeTab === 'cta' ? 'bg-primary text-white' : ''}`}
            >
              <MousePointer className="h-4 w-4" />
              Seção CTA
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Tab 1: Layout Settings */}
          {activeTab === 'layout' && (
            <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <Palette className="h-5 w-5" />
                  Estilos de Layout (Contorno e Cantos)
                </CardTitle>
                <CardDescription>
                  Aprenda como alternar a identidade de cantos arredondados para um tema minimalista reto.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">O que muda no estilo?</h3>
                  <p>
                    A plataforma suporta dois layouts globais para as páginas públicas (como Catálogo de Produtos, Detalhes de Cursos, Detalhes de Produtos, etc.):
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
                    <li><strong>Padrão (Arredondado):</strong> Cantos curvos e suaves (`rounded-lg`, `rounded-full`), design limpo e fluido, ideal para visual corporativo geral.</li>
                    <li><strong>Minimalista Arquitetônico (Cantos Retos):</strong> Cantos totalmente vivos/retos (`rounded-none`), molduras fortes de 1px, efeitos de hover de translação e sombras com deslocamento de bloco sólido. Ideal para marcas premium de design, portfólios e estética editorial de luxo.</li>
                  </ul>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 border rounded-xl">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Como configurar:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>No painel lateral administrativo, acesse <strong>Configurações</strong> &gt; <strong>Sistema</strong>.</li>
                    <li>Vá até a aba/seção <strong>Estilo & Aparência</strong>.</li>
                    <li>Procure pelo campo **"Estilo de Cantos & Bordas"**.</li>
                    <li>Selecione <em>Padrão (Arredondado)</em> ou <em>Minimalista Arquitetônico (Cantos Retos)</em>.</li>
                    <li>Clique em <strong>Salvar Aparência</strong> no rodapé do card para propagar globalmente no site.</li>
                  </ol>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3 rounded-xl">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Observação importante:</span> As alterações se aplicam instantaneamente no painel para que você veja o resultado final, mas só serão carregadas para os alunos/visitantes após você clicar em <strong>Salvar Aparência</strong>.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Banner Hero Settings */}
          {activeTab === 'banners' && (
            <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <Layout className="h-5 w-5" />
                  Configuração de Banners (Hero Banner)
                </CardTitle>
                <CardDescription>
                  Controle a altura total do banner inicial e o alinhamento do botão e textos.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Alinhamento Vertical e Horizontal do Botão</h3>
                  <p>
                    Para garantir que o texto e o botão de ação (CTA) do banner não cubram elementos importantes da imagem de fundo, você pode posicionar o bloco de conteúdo em qualquer quadrante do slide.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/30">
                    <h4 className="font-bold mb-1.5 flex items-center gap-1"><ArrowRight className="h-3.5 w-3.5 text-primary" /> Alinhamento Horizontal</h4>
                    <p className="text-xs text-muted-foreground mb-2">Define se o bloco de textos e botão fica do lado esquerdo, centralizado ou do lado direito do slide.</p>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">Esquerda | Centro | Direita</span>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/30">
                    <h4 className="font-bold mb-1.5 flex items-center gap-1"><ArrowRight className="h-3.5 w-3.5 text-primary" /> Alinhamento Vertical</h4>
                    <p className="text-xs text-muted-foreground mb-2">Define se o bloco de textos e botão fica no topo, no centro geométrico ou na base do slide.</p>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">Topo | Centro | Base</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Altura Integral do Banner (Página Inteira)</h3>
                  <p>
                    Por padrão, os banners do carrossel ocupam uma altura de cabeçalho padrão. Caso deseje que o banner ocupe exatamente a altura visível inicial da tela do visitante (Viewport Height, cobrindo todo o topo), ative a opção de altura estendida.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Imagem Específica para Mobile</h3>
                  <p>
                    Para garantir que seu banner tenha um enquadramento perfeito em smartphones (telas menores que 768px), você pode vincular uma **Imagem Mobile (Opcional)** para cada slide. Se nenhuma imagem mobile for selecionada, o sistema utilizará automaticamente a imagem desktop padrão.
                  </p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 border rounded-xl">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Como configurar:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Na página inicial pública do site, estando logado como administrador, localize o banner principal.</li>
                    <li>Clique no botão **"Gerenciar Banners"** no topo da seção.</li>
                    <li>No modal, ative **"Aumentar altura do banner para preencher a tela aberta"** se desejar visual de página inteira.</li>
                    <li>Ao criar ou editar um slide específico, utilize o controle segmentado de **Posicionamento Horizontal** e **Vertical** para ajustar o botão.</li>
                    <li>Clique em **"Selecionar Mobile"** sob o respectivo slide para escolher ou carregar uma imagem otimizada para smartphones (proporção vertical/quadrada).</li>
                    <li>Clique em <strong>Salvar Alterações</strong>.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Menu Header Builder */}
          {activeTab === 'menus' && (
            <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <MenuIcon className="h-5 w-5" />
                  Construtor de Menus do Topo
                </CardTitle>
                <CardDescription>
                  Crie e organize os links de navegação do site utilizando o construtor visual.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Como funciona o construtor de menus?</h3>
                  <p>
                    O construtor permite criar links de navegação do topo (Header) de forma visual, semelhante ao WordPress. O sistema gera a configuração JSON automaticamente debaixo dos panos, sem que você precise digitar código estruturado manualmente.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Adicionar Itens:</span> Digite o **Rótulo** do link (o texto que aparece no menu) e a **URL/Caminho** (ex: `/produtos` para catálogo, ou links externos como `https://google.com`).
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Ordenar e Remover:</span> Utilize as setas para mover os links para cima ou para baixo para reordenar a sequência no cabeçalho. Para deletar um link indesejado, clique no botão de lixeira vermelho.
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 border rounded-xl">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Como configurar:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Acesse <strong>Configurações</strong> &gt; <strong>Sistema</strong> no painel de administração.</li>
                    <li>Vá até o final da página e localize o card **"Construtor de Menu do Topo"**.</li>
                    <li>Gerencie seus links na lista visual adicionando, excluindo ou ordenando os itens.</li>
                    <li>Clique em **Salvar Configurações de Menu** para atualizar o cabeçalho público instantaneamente.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 4: CTA Section Settings */}
          {activeTab === 'cta' && (
            <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <MousePointer className="h-5 w-5" />
                  Edição e Visibilidade da Seção CTA
                </CardTitle>
                <CardDescription>
                  Personalize a seção de chamada para ação (Call-to-Action) na página principal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base">O que é a seção CTA?</h3>
                  <p>
                    Localizada na página inicial do site público, a seção CTA é o bloco visual com foco em conversão que convida o aluno ou cliente a tomar uma ação principal (ex: matricular-se ou entrar em contato).
                  </p>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 p-4 border rounded-xl">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Como personalizar a seção CTA:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Na página inicial do site público (logado como administrador), role até a seção de CTA.</li>
                    <li>Clique no botão de edição **"Editar Seção CTA"** que aparece flutuando acima do bloco.</li>
                    <li>No modal de opções, você pode alterar:
                      <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-xs">
                        <li><strong>Título & Descrição:</strong> O cabeçalho de destaque e textos explicativos.</li>
                        <li><strong>Texto & Link do Botão:</strong> O rótulo e destino do botão de ação.</li>
                        <li><strong>Cores Customizadas:</strong> A cor de fundo do bloco e a cor dos textos.</li>
                        <li><strong>Visibilidade:</strong> Marque ou desmarque para exibir ou ocultar a seção.</li>
                      </ul>
                    </li>
                    <li>Clique em <strong>Salvar Configurações</strong> para aplicar na hora.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
