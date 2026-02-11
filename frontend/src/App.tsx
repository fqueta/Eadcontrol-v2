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
import { useEffect } from "react";
// import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientView from "./pages/ClientView";
import ClientCreate from "./pages/ClientCreate";
import ClientEdit from "./pages/ClientEdit";
import Partners from "./pages/Partners";
import PartnerView from "./pages/PartnerView";
import ServiceObjects from "./pages/ServiceObjects";
import Aircraft from "./pages/Aircraft";
import AircraftView from "./pages/AircraftView";
import Products from "./pages/Products";
import ProductView from "./pages/ProductView";
import ProductCreate from "./pages/ProductCreate";
import ProductEdit from "./pages/ProductEdit";
import Services from "./pages/Services";
import EmailSend from "./pages/EmailSend";
import CommentsModeration from "./pages/school/CommentsModeration";
import ActivityCommentsModeration from "./pages/school/ActivityCommentsModeration";
// Escola / Módulos e Atividades
import Modules from "./pages/school/Modules";
import ModuleCreate from "./pages/school/ModuleCreate";
import ModuleEdit from "./pages/school/ModuleEdit";
import Activities from "./pages/school/Activities";
import ActivityCreate from "./pages/school/ActivityCreate";
import ActivityEdit from "./pages/school/ActivityEdit";
import ActivityView from "./pages/school/ActivityView";
import ServiceView from "./pages/ServiceView";
import Categories from "./pages/Categories";
import Permissions from "./pages/settings/Permissions";
import Users from "./pages/settings/Users";
import UserCreate from "./pages/settings/UserCreate";
import UserProfiles from "./pages/settings/UserProfiles";
import SystemSettings from "./pages/settings/SystemSettings";
import Stages from "./pages/settings/Stages";
import TableInstallment from "./pages/settings/TableInstallment";
import Login from "./pages/auth/Login";
import Metrics from "./pages/settings/Metrics";
import AircraftsSettings from "./pages/settings/AircraftsSettings";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";
import { PermissionGuard } from "./components/auth/PermissionGuard";
import Dashboard from "@/pages/Dashboard";
import MetricsDashboard from "@/pages/MetricsDashboard";
import ServiceOrders from "./pages/ServiceOrders";
import CreateServiceOrder from "./pages/CreateServiceOrder";
import UpdateServiceOrder from "./pages/UpdateServiceOrder";
import ShowServiceOrder from "./pages/ShowServiceOrder";
import QuickCreateServiceOrder from "./pages/QuickCreateServiceOrder";
import Financial from "./pages/financial/Financial";
import FinancialCategories from "./pages/FinancialCategories";
import PublicClientForm from "@/pages/PublicClientForm";
import PointsStore from "@/pages/loja/PointsStore";
import ProductDetails from "./pages/loja/ProductDetails";
import MyRedemptions from "./pages/loja/MyRedemptions";
import RedemptionDetails from "./pages/loja/RedemptionDetails";
import ClientArea from "./pages/loja/ClientArea";
import LandingPage from "./pages/LandingPage";
/**
 * Removed Admin points pages imports
 * pt-BR: Removidos imports das páginas de administração de pontos para evitar
 *        requisições GET de módulos inexistentes durante o carregamento.
 * en-US: Removed imports of admin points pages to prevent GET requests for
 *        missing modules at app load time.
 */
import CustomersLeads from "./pages/CustomersLeads";
import Sales from "./pages/Sales";
import ProposalsCreate from "./pages/ProposalsCreate";
import ProposalsEdit from "./pages/ProposalsEdit";
import ProposalsView from "./pages/ProposalsView";
import Courses from "./pages/school/Courses";
import CourseCreate from "./pages/school/CourseCreate";
import CourseEdit from "./pages/school/CourseEdit";
 import CourseLanding from "./pages/school/CourseLanding";
 import CourseDetails from "./pages/school/CourseDetails";
import InviteEnroll from "./pages/school/InviteEnroll";
import InvitesAdminPage from "./pages/school/Invites";
import StudentCourse from "./pages/school/StudentCourse";
import StudentCourseProgress from "./pages/school/StudentCourseProgress";
import AdminCourseProgress from "./pages/school/AdminCourseProgress";
import AdminEnrollmentProgress from "./pages/school/AdminEnrollmentProgress";
import StudentCourses from "./pages/school/StudentCourses";
import StudentArea from "./pages/school/StudentArea";
import StudentInvoices from "./pages/school/StudentInvoices";
import StudentOrders from "./pages/school/StudentOrders";
import StudentGrades from "./pages/school/StudentGrades";
import StudentProfile from "./pages/school/StudentProfile";
import CourseAdminPreview from "./pages/school/CourseAdminPreview";
import CoursesPublicList from "./pages/school/CoursesPublicList";
import Classes from "./pages/school/Classes";
import ClassCreate from "./pages/school/ClassCreate";
import ClassEdit from "./pages/school/ClassEdit";
import Enroll from "./pages/school/Enroll";
import EnrollmentSituationPage from "./pages/school/EnrollmentSituation";
import Interested from "./pages/school/Interested";
import MediaLibraryDemo from "./pages/media/MediaLibraryDemo";
import CertificateTemplate from "./pages/school/CertificateTemplate";
import CertificateGenerate from "./pages/school/CertificateGenerate";
import CertificateView from "./pages/school/CertificateView";
import CertificateValidate from "./pages/school/CertificateValidate";
import AdminCourseGrades from "./pages/school/AdminCourseGrades";
import ContentAccessReport from "./pages/reports/ContentAccessReport";

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
          </BrowserRouter>
          </TooltipProvider>
          </UserPrefsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
