# Project Context for AI Agents

## Project Overview
**Name**: Eadcontrol-v2
**Type**: Multi-tenant LMS (Learning Management System) / ERP Platform
**Architecture**: Monorepo-style structure with separate Backend (Laravel API) and Frontend (React SPA).

## Technology Stack

### Backend (`/backend`)
-   **Framework**: Laravel 12.x
-   **Server Runtime**: Laravel Octane (RoadRunner)
-   **Language**: PHP 8.2+
-   **Database**: MySQL 8.0
-   **Cache/Queue**: Redis
-   **Multi-tenancy**: `stancl/tenancy` (Database per tenant or scope-based - check config)
-   **Authentication**: Laravel Sanctum (SPA Authentication)
-   **Key Libraries**:
    -   `spiral/roadrunner` (High-performance PHP app server)
    -   `laravel/sail` (Docker development environment)

### Frontend (`/frontend`)
-   **Framework**: React 18+
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **UI Library**: Shadcn/ui (Radix Primitives + Tailwind CSS)
-   **Styling**: Tailwind CSS
-   **State Management**: React Context (`AuthContext`), `react-hook-form`
-   **HTTP Client**: Native `fetch` with `authService.ts` abstraction
-   **Routing**: React Router

### Infrastructure
-   **Development**: Docker Compose via Laravel Sail.
    -   Services: `laravel.test` (App), `mysql`, `redis`, `mailpit`, `phpmyadmin`.
-   **Production**: Custom Docker Compose (`docker-compose.production.yml`)
    -   Reverse Proxy: Nginx (handling routing between Frontend/Backend containers).
    -   Container 1: `octane_app` (Backend) on port 8000.
    -   Container 2: `frontend_app` (Nginx serving static files).

## Key Workflows & Commands

### Development Startup
1.  **Backend (Octane)**:
    ```bash
    cd backend
    php artisan octane:start --server=roadrunner --port=8002
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm run dev
    ```

### Authentication Flow
-   **Login**: POST `/api/v1/login`. Returns `token` (Sanctum) and `user` object.
-   **Token Storage**: `localStorage` keys: `auth_token`, `auth_user`.
-   **Context**: `AuthContext.tsx` hydrates state from localStorage and syncs with `/api/v1/user`.
-   **Protection**: `authService.ts` automatically attaches `Authorization: Bearer` header.

### File Storage
-   **Disk**: `public` (symlinked to `storage/app/public`).
-   **Access**: Files are served via Nginx/Octane at `/storage/...`.
-   **Uploads**: Handled in `UserController` (and others), explicitly using `store(path, 'public')`.

## Key Directory Structure

### Backend
-   `routes/api.php`: API definitions. Versioned as `/api/v1/...`.
-   `app/Http/Controllers/api`: JSON API Controllers.
-   `app/Services`: Business logic (e.g., `PermissionService`, `Qlib` helper).
-   `config/`: Standard Laravel config (Pay attention to `cors.php`, `filesystems.php`).

### Frontend
-   `src/components/ui`: Reusable Shadcn components.
-   `src/pages`: Application views.
-   `src/services`: API interactions (e.g., `authService.ts`).
-   `src/contexts`: Global state (e.g., `AuthContext.tsx`).
-   `src/lib`: Utilities (e.g., `qlib.tsx` for Tenant URL resolution).

## Recent Modifications (Context for Continuation)
-   **Student Profile**:
    -   Files: `frontend/src/pages/school/StudentProfile.tsx`, `backend/app/Http/Controllers/api/UserController.php`.
    -   Feature: API `POST /user/update-profile` implemented for self-service updates.
    -   Fixes: Solved issues with Octane route caching (Require `octane:reload`), Nginx storage routing, and JSON response parsing.
-   **Coupon System (Cupom de Desconto)**:
    -   **Migration**: `backend/database/migrations/tenant/2026_05_14_000000_create_cupons_table.php`
        -   Tabela `cupons` com campos: `codigo` (unique), `tipo` (percentual|fixo), `valor_desconto`, `validade_inicio`, `validade_fim`, `limite_uso`, `usos`, `valor_minimo`, `ativo`, `descricao`, `cursos_ids`, flags de soft-delete (`excluido`, `deletado`).
    -   **Model**: `backend/app/Models/Cupom.php`
        -   Metodos: `validar(float $valorCompra, ?int $cursoId)` e `calcularDesconto(float $valorCompra)`, `incrementarUso()`.
        -   Global scope `notDeleted`.
    -   **Controller (Publico)**: `backend/app/Http/Controllers/api/CheckoutController.php`
        -   `POST applyCoupon(Request)` - endpoint publico que valida o cupom e retorna o desconto calculado.
        -   `process(Request)` atualizado: aceita `coupon_code`, aplica desconto no `subtotal`/`total` da matricula, registra log e incrementa uso.
        -   Rotas: `POST /api/v1/public/checkout/apply-coupon`.
    -   **Controller (Admin CRUD)**: `backend/app/Http/Controllers/api/CupomController.php`
        -   CRUD completo: index (com search/filtro), store, show, update, destroy (soft), trash, restore, forceDelete.
        -   Rotas autenticadas: `GET/POST/PUT/DELETE /api/v1/cupons`, `cupons/trash`, `cupons/{id}/restore`, `cupons/{id}/force`.
    -   **Seeder**: `backend/database/seeders/CuponsSeeder.php`
        -   3 cupons de teste: `BEMVINDO10` (10%), `DESCONTO50` (R$50), `VIP2026` (25%, min R$100).
        -   Rodar com: `php artisan tenants:seed --class=CuponsSeeder`.
    -   **Frontend - Service**: `frontend/src/services/checkoutService.ts`
        -   `applyCoupon(codigo, course_id)` retorna `CouponResponse`.
    -   **Frontend - Checkout**: `frontend/src/pages/school/FastCheckout.tsx`
        -   Input de cupom com botao "Aplicar" e suporte a Enter.
        -   Exibe resultado com tag verde, possibilidade de remover.
        -   Preco no header atualizado em tempo real (riscado + valor com desconto).
        -   `coupon_code` enviado no payload do pagamento.
    -   **Frontend - Admin**: `frontend/src/pages/settings/CupomDesconto.tsx`
        -   Pagina de gerenciamento (CRUD) de cupons em `/admin/settings/cupom_desconto`.
        -   Tabela com busca, dialogo de criacao/edicao, confirmacao de exclusao.
        -   Rota registrada em `App.tsx` com lazy loading.
        -   Menu lateral ja existia (menu.json e menu_crm.json apontando para `/settings/cupom_desconto`).
    -   **Fix**: `DB_HOST` no `.env` alterado de `127.0.0.1` para `172.21.0.1` (gateway IP da rede Docker) para resolver problema de conexao com MySQL a partir do container `laravel.test`.
-   **Novo Tenant "hair"**:
    -   Tenant ID: `api-hair`, Dominio: `hair.localhost`, Database: `eadcontrol_hair`.
    -   Criado via tinker, migracoes e seeders executados.
-   **Produtos - Endpoint Publico**:
    -   `backend/app/Http/Controllers/api/ProductController.php`: Novo metodo `publicIndex()` — lista produtos publicados sem autenticacao. Aceita filtros `category`, `search` e `ids`.
    -   `backend/routes/tenant.php`: Rotas publicas `GET /api/v1/public/products` e `GET /api/v1/public/produtos`.
-   **Produtos - Catalogo na Pagina do Curso**:
    -   `frontend/src/services/publicProductsService.ts`: Novo servico para consumir endpoint publico de produtos.
    -   `frontend/src/pages/school/CourseDetails.tsx`: Secao "Catalogo de Produtos" exibindo produtos associados ao curso (via `config.product_ids`).
-   **Produtos - Associacao com Curso**:
    -   `frontend/src/types/courses.ts`: Adicionado `product_ids?: string[]` ao `CourseConfig`.
    -   `frontend/src/components/school/CourseForm.tsx`: Novo componente `ProductSelect` (multi-select com busca) na aba "Configuracoes". Incluido `product_ids` no defaultValues, initialData e normalizePayload.
-   **Produtos - Banner no Curso**:
    -   `frontend/src/types/courses.ts`: Adicionado `banner` ao `CourseConfig`.
    -   `frontend/src/components/school/CourseForm.tsx`: Upload de banner na aba "Imagem" com ImageUpload, MediaLibraryModal, preview.
    -   `frontend/src/pages/school/CourseDetails.tsx`: Renderizacao do banner no topo da pagina.
    -   `backend/app/Http/Controllers/api/CursoController.php`: Normalizacao de `banner_url`/`banner_file_id`/`banner_titulo` em `sanitizeCursoData()`.
-   **Produtos - Link no Menu**:
    -   `backend/database/seeders/data/menu.json`: Adicionado item "Produtos" (`/admin/products`) no submenu "Escola".
-   **Curso - Fix Duplicacao ao Salvar**:
    -   `frontend/src/components/school/CourseForm.tsx`: Adicionado state `createdCourseId` para armazenar ID retornado apos primeiro `createCourse`. `saveAndStay`/`saveAndExit` agora usam `initialData?.id ?? createdCourseId` para decidir entre create e update.
-   **Curso - Link para Pagina Publica**:
    -   `frontend/src/components/school/CourseForm.tsx`: Botao "PAGINA DO CURSO" na barra superior que abre `/cursos/{slug}/detalhes` em nova aba.
-   **Curso - Taxa de Inscricao (inscricao)**:
    -   `frontend/src/pages/school/CourseDetails.tsx`: Exibicao da taxa de inscricao no price box.
    -   `backend/app/Http/Controllers/api/CheckoutController.php`: `getCourse()` agora retorna `inscricao`. `applyCoupon()` e `process()` usam `valor + inscricao` como base para calculo do total. `inscricao` salvo no `config` da matricula.
    -   `frontend/src/services/checkoutService.ts`: Adicionado `inscricao` ao `CheckoutCourse`.
    -   `frontend/src/pages/school/FastCheckout.tsx`: Exibicao da taxa separada no resumo do pedido e inclusao no total.
-   **Produtos - CRUD e Formulario**:
    -   `frontend/src/components/products/ProductForm.tsx`: Schema `terms` alterado para opcional. Campos `salePrice`/`costPrice` agora com mascara de moeda (BRL). Descricao usa `RichTextEditor` (HTML). Imagem com `MediaLibraryModal` + `ImageUpload`.
    -   `frontend/src/pages/ProductCreate.tsx` / `ProductEdit.tsx`: Removido `<form>` externo aninhado (causava warning React).
    -   `frontend/src/components/products/ProductsTable.tsx`: Ativadas opcoes "Editar" e "Excluir" no menu de acoes (dropdown).
-   **Backend - Fix Namespace case-sensitive**:
    -   `backend/app/Http/Controllers/api/ProductUnitController.php`: Namespace corrigido de `Api` para `api` (minusculo) para compatibilidade Linux.
    -   `backend/app/Http/Controllers/api/ProductUnitController.php`: `map_product_unit()` agora retorna `null` se `$productUnit` for null.
    -   `backend/app/Services/Qlib.php`: `get_unit_by_id()` retorna `null` se `$id` vazio ou unidade nao encontrada.
    -   `backend/app/Services/PermissionService.php`: Mapeamento de rotas de produtos corrigido de `/products` para `/admin/products`.

## Important Constraints & Rules
-   **Octane**: Code changes in generic PHP classes may require `artisan octane:reload` to take effect due to memory persistence.
-   **CORS**: Configured in `config/cors.php`. Frontend typically runs on different port/subdomain in Dev.
-   **Validation**: Frontend uses Zod, Dashboard uses Laravel Request classes.

---
*Generated by Antigravity on 2026-01-16*
