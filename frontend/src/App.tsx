import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserPrefsProvider } from "@/contexts/UserPrefsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "./components/auth/AdminProtectedRoute";
import { AuthRedirect } from "./components/auth/AuthRedirect";
import { AppLayout } from "./components/layout/AppLayout";
import FaviconUpdater from "@/components/branding/FaviconUpdater";
import { hydrateBrandingFromPublicApi, applyBrandingFromPersistedSources } from "@/lib/branding";
import React, { useEffect, lazy, Suspense } from "react";
// import Dashboard from "./pages/Dashboard";
const Clients = lazy(() => import("./pages/Clients"));
const ClientView = lazy(() => import("./pages/ClientView"));
const ClientCreate = lazy(() => import("./pages/ClientCreate"));
const ClientEdit = lazy(() => import("./pages/ClientEdit"));
const Partners = lazy(() => import("./pages/Partners"));
const PartnerView = lazy(() => import("./pages/PartnerView"));
const ServiceObjects = lazy(() => import("./pages/ServiceObjects"));
const Aircraft = lazy(() => import("./pages/Aircraft"));
const AircraftView = lazy(() => import("./pages/AircraftView"));
const Products = lazy(() => import("./pages/Products"));
const ProductView = lazy(() => import("./pages/ProductView"));
const ProductCreate = lazy(() => import("./pages/ProductCreate"));
const ProductEdit = lazy(() => import("./pages/ProductEdit"));
const Services = lazy(() => import("./pages/Services"));
const EmailSend = lazy(() => import("./pages/EmailSend"));
const CommentsModeration = lazy(() => import("./pages/school/CommentsModeration"));
const ActivityCommentsModeration = lazy(() => import("./pages/school/ActivityCommentsModeration"));
// Escola / Módulos e Atividades
const Modules = lazy(() => import("./pages/school/Modules"));
const ModuleCreate = lazy(() => import("./pages/school/ModuleCreate"));
const ModuleEdit = lazy(() => import("./pages/school/ModuleEdit"));
const Activities = lazy(() => import("./pages/school/Activities"));
const ActivityCreate = lazy(() => import("./pages/school/ActivityCreate"));
const ActivityEdit = lazy(() => import("./pages/school/ActivityEdit"));
const ActivityView = lazy(() => import("./pages/school/ActivityView"));
const ServiceView = lazy(() => import("./pages/ServiceView"));
const Categories = lazy(() => import("./pages/Categories"));
const Permissions = lazy(() => import("./pages/settings/Permissions"));
const Users = lazy(() => import("./pages/settings/Users"));
const UserCreate = lazy(() => import("./pages/settings/UserCreate"));
const UserProfiles = lazy(() => import("./pages/settings/UserProfiles"));
const SystemSettings = lazy(() => import("./pages/settings/SystemSettings"));
const IntegrationsList = lazy(() => import("./pages/settings/IntegrationsList"));
const Stages = lazy(() => import("./pages/settings/Stages"));
const TableInstallment = lazy(() => import("./pages/settings/TableInstallment"));
const Login = lazy(() => import("./pages/auth/Login"));
const Metrics = lazy(() => import("./pages/settings/Metrics"));
const AircraftsSettings = lazy(() => import("./pages/settings/AircraftsSettings"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
import NotFound from "./pages/NotFound";
import { PermissionGuard } from "./components/auth/PermissionGuard";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MetricsDashboard = lazy(() => import("@/pages/MetricsDashboard"));
const ServiceOrders = lazy(() => import("./pages/ServiceOrders"));
const CreateServiceOrder = lazy(() => import("./pages/CreateServiceOrder"));
const UpdateServiceOrder = lazy(() => import("./pages/UpdateServiceOrder"));
const ShowServiceOrder = lazy(() => import("./pages/ShowServiceOrder"));
const QuickCreateServiceOrder = lazy(() => import("./pages/QuickCreateServiceOrder"));
const Financial = lazy(() => import("./pages/financial/Financial"));
const FinancialCategories = lazy(() => import("./pages/FinancialCategories"));
const PublicClientForm = lazy(() => import("@/pages/PublicClientForm"));
const PointsStore = lazy(() => import("@/pages/loja/PointsStore"));
const ProductDetails = lazy(() => import("./pages/loja/ProductDetails"));
const MyRedemptions = lazy(() => import("./pages/loja/MyRedemptions"));
const RedemptionDetails = lazy(() => import("./pages/loja/RedemptionDetails"));
const ClientArea = lazy(() => import("./pages/loja/ClientArea"));
import LandingPage from "./pages/LandingPage";
/**
 * Removed Admin points pages imports
 * pt-BR: Removidos imports das páginas de administração de pontos para evitar
 *        requisições GET de módulos inexistentes durante o carregamento.
 * en-US: Removed imports of admin points pages to prevent GET requests for
 *        missing modules at app load time.
 */
const CustomersLeads = lazy(() => import("./pages/CustomersLeads"));
const Sales = lazy(() => import("./pages/Sales"));
const ProposalsCreate = lazy(() => import("./pages/ProposalsCreate"));
const ProposalsEdit = lazy(() => import("./pages/ProposalsEdit"));
const ProposalsView = lazy(() => import("./pages/ProposalsView"));
const Courses = lazy(() => import("./pages/school/Courses"));
const CourseCreate = lazy(() => import("./pages/school/CourseCreate"));
const CourseEdit = lazy(() => import("./pages/school/CourseEdit"));
const CourseLanding = lazy(() => import("./pages/school/CourseLanding"));
const CourseDetails = lazy(() => import("./pages/school/CourseDetails"));
const InviteEnroll = lazy(() => import("./pages/school/InviteEnroll"));
const InvitesAdminPage = lazy(() => import("./pages/school/Invites"));
const StudentCourse = lazy(() => import("./pages/school/StudentCourse"));
const StudentCourseProgress = lazy(() => import("./pages/school/StudentCourseProgress"));
const AdminCourseProgress = lazy(() => import("./pages/school/AdminCourseProgress"));
const AdminEnrollmentProgress = lazy(() => import("./pages/school/AdminEnrollmentProgress"));
const StudentCourses = lazy(() => import("./pages/school/StudentCourses"));
const StudentArea = lazy(() => import("./pages/school/StudentArea"));
const StudentInvoices = lazy(() => import("./pages/school/StudentInvoices"));
const StudentOrders = lazy(() => import("./pages/school/StudentOrders"));
const StudentGrades = lazy(() => import("./pages/school/StudentGrades"));
const StudentProfile = lazy(() => import("./pages/school/StudentProfile"));
const CourseAdminPreview = lazy(() => import("./pages/school/CourseAdminPreview"));
const CoursesPublicList = lazy(() => import("./pages/school/CoursesPublicList"));
const Classes = lazy(() => import("./pages/school/Classes"));
const ClassCreate = lazy(() => import("./pages/school/ClassCreate"));
const ClassEdit = lazy(() => import("./pages/school/ClassEdit"));
const Enroll = lazy(() => import("./pages/school/Enroll"));
const EnrollmentSituationPage = lazy(() => import("./pages/school/EnrollmentSituation"));
const Interested = lazy(() => import("./pages/school/Interested"));
const MediaLibraryDemo = lazy(() => import("./pages/media/MediaLibraryDemo"));
const CertificateTemplate = lazy(() => import("./pages/school/CertificateTemplate"));
const CertificateGenerate = lazy(() => import("./pages/school/CertificateGenerate"));
const CertificateView = lazy(() => import("./pages/school/CertificateView"));
const CertificateValidate = lazy(() => import("./pages/school/CertificateValidate"));
const AdminCourseGrades = lazy(() => import("./pages/school/AdminCourseGrades"));
const ContentAccessReport = lazy(() => import("./pages/reports/ContentAccessReport"));
const MenusSite = lazy(() => import("./pages/site/MenusSite"));
const PageCreate = lazy(() => import("./pages/site/PageCreate"));
const PageEdit = lazy(() => import("./pages/site/PageEdit"));
const PublicPage = lazy(() => import("./pages/site/PublicPage"));
const SiteComponents = lazy(() => import("./pages/site/Components"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configurações para consultas
      retry: (failureCount, error: any) => {
        if (
          error?.status === 400 ||
          error?.status === 401 ||
          error?.status === 403 ||
          error?.status === 404
        ) {
          return false;
        }
        return failureCount < 1;
      },
      // 5 minutos
      staleTime: 5 * 60 * 1000,
      // 30 minutos (anteriormente cacheTime)
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchOnMount: true,
    },
    mutations: {
      // Configurações para mutações (create, update, delete)
      retry: 1,
    },
  },
});

/**
 * App — Provider stack and routes
 * pt-BR: Envolve a aplicação com QueryClientProvider, ThemeProvider, AuthProvider
 * e UserPrefsProvider, garantindo o contexto em todas as rotas e layouts.
 * en-US: Wraps the app with QueryClientProvider, ThemeProvider, AuthProvider,
 * and UserPrefsProvider, ensuring context availability across routes/layouts.
 */
const App = () => {
  useEffect(() => {
    // Initial branding application from local sources (fast)
    applyBrandingFromPersistedSources();
    
    // Asynchronous hydration from API (up-to-date)
    hydrateBrandingFromPublicApi({ persist: true })
      .then(() => {
        applyBrandingFromPersistedSources();
      })
      .catch(() => {});
  }, []);

  const link_loja = "/loja";
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserPrefsProvider>
            <TooltipProvider>
            {/*
             * FaviconUpdater
             * pt-BR: Mantém o favicon sincronizado com valores persistidos/global.
             * en-US: Keeps favicon in sync with persisted/global values.
             */}
            <FaviconUpdater />
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando…</div>}>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/"  element={<LandingPage linkLoja={link_loja} />} />
              <Route path="/login" element={
                <AuthRedirect>
                  <Login />
                </AuthRedirect>
              } />
              <Route path="/register" element={
                <AuthRedirect>
                  <Register />
                </AuthRedirect>
              } />
              <Route path="/forgot-password" element={
                <AuthRedirect>
                  <ForgotPassword />
                </AuthRedirect>
              } />
              <Route path="/reset-password" element={
                <AuthRedirect>
                  <ResetPassword />
                </AuthRedirect>
              } />
              {/* Rota alternativa: suporta token como segmento de caminho */}
              <Route path="/reset-password/:token" element={
                <AuthRedirect>
                  <ResetPassword />
                </AuthRedirect>
              } />
              <Route path="/form-client-active/:cpf" element={<PublicClientForm />} />
              <Route path="/public-client-form" element={<PublicClientForm />} />
              
              {/* Rotas da loja - protegidas */}
              <Route path={link_loja} element={
                <ProtectedRoute>
                  <PointsStore linkLoja={link_loja} />
                </ProtectedRoute>
              } />
              <Route path={link_loja + "/produto/:productId"} element={
                <ProtectedRoute>
                  <ProductDetails linkLoja={link_loja} />
                </ProtectedRoute>
              } />
              <Route path={link_loja + "/meus-resgates"} element={
                <ProtectedRoute>
                  <MyRedemptions linkLoja={link_loja} />
                </ProtectedRoute>
              } />
              <Route path={link_loja + "/resgate/:id"} element={
                <ProtectedRoute>
                  <RedemptionDetails linkLoja={link_loja} />
                </ProtectedRoute>
              } />
              <Route path={link_loja + "/area-cliente"} element={ 
                <ProtectedRoute>
                  <ClientArea linkLoja={link_loja} />
                </ProtectedRoute>
              } />
              <Route path={link_loja + "/configuracoes"} element={ 
                <ProtectedRoute>
                  <Navigate to={`${link_loja}/area-cliente?tab=settings`} replace />
                </ProtectedRoute>
              } />
              
              {/* Rotas protegidas */}
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    {/* <Dashboard2 /> */}
                    <Dashboard />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              
              {/* <Route path="/painel2" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard2 />
                  </AppLayout>
                </ProtectedRoute>
              } /> */}
              <Route path="/admin/clients" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Clients />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Cursos */}
              <Route path="/admin/school/courses" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Courses />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Tools / Email Send */}
              <Route path="/admin/tools/email-send" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <EmailSend />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Comentários (Moderação) */}
              <Route path="/admin/school/comments" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CommentsModeration />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/comments" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CommentsModeration />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Convites de matrícula */}
              <Route path="/admin/school/invites" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <InvitesAdminPage />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/courses/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CourseCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Escola / Módulos */}
              <Route path="/admin/school/modules" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Modules />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/modules/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ModuleCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/modules/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ModuleEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Escola / Atividades */}
              <Route path="/admin/school/activities" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Activities />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Atividade — Visualização de conteúdo (admin) */}
              <Route path="/admin/school/activities/:id/view" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ActivityView />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Atividade • Conteúdo + Comentários (Moderação) */}
              <Route path="/admin/school/activities/:id/comments" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ActivityCommentsModeration />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/activities/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ActivityCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/activities/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ActivityEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/courses/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CourseEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Cursos — Pré-visualização do aluno (admin) */}
              <Route path="/admin/school/courses/:id/preview" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CourseAdminPreview />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Cursos — Progresso dos alunos (admin) */}
              <Route path="/admin/school/courses/:id/progress" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <AdminCourseProgress />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Escola / Cursos — Notas dos alunos (admin) */}
              <Route path="/admin/school/courses/:id/grades" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <AdminCourseGrades />
                  </AppLayout>
                </AdminProtectedRoute>
              } />


              {/* Escola / Matrículas — Detalhe de progresso (admin) */}
              <Route path="/admin/school/enrollments/:id/progress" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <AdminEnrollmentProgress />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Escola / Turmas */}
              <Route path="/admin/school/classes" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Classes />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Matrículas */}
              <Route path="/admin/school/enroll" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Enroll />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Interessados */}
              <Route path="/admin/school/interested" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Interested />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Escola / Situações de Matrícula */}
              <Route path="/admin/school/enrollment-situation" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <EnrollmentSituationPage />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Biblioteca de Mídia — Demo */}
              <Route path="/admin/settings/media-library-demo" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <MediaLibraryDemo />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              
              <Route path="/admin/school/classes/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ClassCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/classes/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ClassEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Admin / Certificados (modelo e vinculação) */}
              <Route path="/admin/school/certificados/modelo" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CertificateTemplate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/school/certificados/gerar" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CertificateGenerate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Público / Lista de Cursos e Landing */}
              <Route path="/cursos" element={<CoursesPublicList />} />
              <Route path="/cursos/:id" element={<CourseLanding />} />
              <Route path="/cursos/:id/detalhes" element={<CourseDetails />} />
              {/* Página pública publicada por slug */}
              <Route path="/pagina/:slug" element={<PublicPage />} />
              {/**
               * pt-BR: Página pública de convite de matrícula via link do curso.
               * en-US: Public invitation enrollment page via course link.
               */}
              {/* <Route path="/cursos/:id/inscricao" element={<InviteEnroll />} /> */}
              {/* Suporte a token de convite como segmento de caminho */}
              <Route path="/cursos/:id/inscricao/:token" element={<InviteEnroll />} />
              {/* Área do Aluno / Consumo de Conteúdo (protegida, sem layout de admin) */}
              <Route path="/aluno/cursos/:slug" element={
                <ProtectedRoute>
                  <StudentCourse />
                </ProtectedRoute>
              } />
              {/* Área do Aluno / Certificado imprimível (protegida) */}
              <Route path="/aluno/certificado/:enrollmentId" element={
                <ProtectedRoute>
                  <CertificateView />
                </ProtectedRoute>
              } />
              {/* Público / Validação de certificado por matrícula */}
              <Route path="/certificado/validar/:enrollmentId" element={<CertificateValidate />} />
              {/* Área do Aluno / Progresso do Curso (protegida) */}
              <Route path="/aluno/cursos/:slug/progresso" element={
                <ProtectedRoute>
                  <StudentCourseProgress />
                </ProtectedRoute>
              } />
              {/* Área do Aluno / Meus cursos (protegida) */}
              <Route path="/aluno/cursos" element={
                <ProtectedRoute>
                  <StudentCourses />
                </ProtectedRoute>
              } />
              {/* Área do Aluno / Painel (protegida) */}
              {/**
               * pt-BR: Painel do aluno EAD com lista de matrículas e acesso rápido.
               * en-US: EAD student dashboard listing enrollments and quick access.
               */}
              <Route path="/aluno" element={
                <ProtectedRoute>
                  <StudentArea />
                </ProtectedRoute>
              } />
              {/* Área do Aluno / Navegação adicional (protegida) */}
              {/**
               * pt-BR: Rotas placeholders de navegação: faturas, pedidos, notas e perfil.
               * en-US: Placeholder navigation routes: invoices, orders, grades and profile.
               */}
              <Route path="/aluno/faturas" element={
                <ProtectedRoute>
                  <StudentInvoices />
                </ProtectedRoute>
              } />
              <Route path="/aluno/pedidos" element={
                <ProtectedRoute>
                  <StudentOrders />
                </ProtectedRoute>
              } />
              <Route path="/aluno/notas" element={
                <ProtectedRoute>
                  <StudentGrades />
                </ProtectedRoute>
              } />
              <Route path="/aluno/perfil" element={
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              } />
              <Route path="/admin/clients/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ClientCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/clients/:id/view" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ClientView />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/clients/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ClientEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Rotas de parceiros */}
              <Route path="/admin/partners" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Partners />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Aeronaves (listagem com painel de filtros) */}
              <Route path="/admin/aircrafts" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Aircraft />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/partners/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PartnerView />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/partners/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Partners />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Rotas de produtos */}
              <Route path="/admin/products" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Products />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/products/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ProductCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/products/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ProductEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/products/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ProductView />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Leads de Atendimento */}
              <Route path="/admin/customers/leads" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CustomersLeads />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Vendas / Funis de Vendas */}
              <Route path="/admin/sales" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Sales />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Vendas / Cadastro de Propostas */}
              <Route path="/admin/sales/proposals/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ProposalsCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Vendas / Editar Proposta */}
              <Route path="/admin/sales/proposals/edit/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ProposalsEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Vendas / Visualizar Proposta */}
              <Route path="/admin/sales/proposals/view/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ProposalsView />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Alias sem prefixo admin (redireciona) */}
              <Route path="/sales/proposals/create" element={<Navigate to="/admin/sales/proposals/create" replace />} />
              <Route path="/sales/proposals/edit/:id" element={<Navigate to="/admin/sales/proposals/edit/:id" replace />} />
              <Route path="/sales/proposals/view/:id" element={<Navigate to="/admin/sales/proposals/view/:id" replace />} />

              {/* Rotas de serviços */}
              <Route path="/admin/services" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Services />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/services/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ServiceView />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Categorias */}
              <Route path="/admin/categories" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <Categories />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/site/menus-site" element={<Navigate to="/admin/site/menus-site" replace />} />
              <Route path="/admin/site/menus-site" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <MenusSite />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/site/components" element={<Navigate to="/admin/site/components" replace />} />
              <Route path="/admin/site/components" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <SiteComponents />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/site/pages/create" element={<Navigate to="/admin/site/pages/create" replace />} />
              <Route path="/site/pages/:id/edit" element={<Navigate to="/admin/site/pages/:id/edit" replace />} />
              <Route path="/admin/site/pages/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PageCreate />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/site/pages/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PageEdit />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Relatórios — Acesso de Conteúdo */}
              <Route path="/admin/reports/content-access" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ContentAccessReport />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Settings */}
              <Route path="/admin/settings/permissions" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard 
                      required="settings.permissions.view" 
                      menuPath="/admin/settings/permissions"
                      requireRemote={false}
                    >
                      <Permissions />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/integrations" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <IntegrationsList />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/table-installment" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    {/* pt-BR/en-US: Installment tables management */}
                    <TableInstallment />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* TableInstallment dedicated pages: create and edit */}
              <Route path="/admin/settings/table-installment/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <TableInstallment />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/table-installment/:id/edit" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <TableInstallment />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/aircrafts" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <AircraftsSettings />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/stages" element={
                <AdminProtectedRoute>
                  <AppLayout>
                  {/* Sem PermissionGuard por enquanto para acesso rápido */}
                    <Stages />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/users" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard 
                      menuPath="/admin/settings/users"
                      requireRemote={false}
                    >
                      <Users />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              {/* Página dedicada para criação de usuário */}
              <Route path="/admin/settings/users/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard 
                      menuPath="/admin/settings/users"
                      requireRemote={false}
                    >
                      {/* pt-BR/en-US: Dedicated user creation page */}
                      <UserCreate />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/metrics" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard required="settings.metrics.view">
                      <Metrics />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/metrics-dashboard" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard required="settings.metrics.view">
                      <MetricsDashboard />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/user-profiles" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <UserProfiles />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings/system" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard 
                      required="settings.system.view" 
                      menuPath="/admin/settings/system"
                      requireRemote={false}
                    >
                      <SystemSettings />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Financeiro */}
              <Route path="/admin/financial" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard 
                      required="financial.view" 
                      menuPath="/admin/financial"
                      requireRemote={false}
                    >
                      <Financial />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/financial/categories" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <PermissionGuard 
                      required="financial.categories.view" 
                      menuPath="/admin/financial/categories"
                      requireRemote={false}
                    >
                      <FinancialCategories />
                    </PermissionGuard>
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/**
               * Points Admin routes removed
               * pt-BR: Rotas de administração de pontos desativadas temporariamente para
               *        impedir a tentativa de carregar módulos ausentes.
               * en-US: Points admin routes temporarily disabled to prevent loading
               *        missing modules.
               */}

              {/* Ordens de Serviço */}
              <Route path="/admin/service-orders" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ServiceOrders />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/service-orders/quick-create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <QuickCreateServiceOrder />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/service-orders/create" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <CreateServiceOrder />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/service-orders/update/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <UpdateServiceOrder />
                  </AppLayout>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/service-orders/show/:id" element={
                <AdminProtectedRoute>
                  <AppLayout>
                    <ShowServiceOrder />
                  </AppLayout>
                </AdminProtectedRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          </TooltipProvider>
          </UserPrefsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
