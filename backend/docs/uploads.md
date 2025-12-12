# Uploads API / API de Uploads

Documentação para gerenciar uploads de arquivos no backend (Laravel 12) com metadados persistidos na tabela `posts`.

- PT-BR: Uploads podem ser feitos por dois recursos: `activities` (tipo `document`) e `file-storage` (genérico). Ambos gravam metadados em `posts` com campos como `guid`, `post_mime_type` e `config`.
- EN: Uploads are handled by two resources: `activities` (type `document`) and `file-storage` (generic). Both persist metadata in the `posts` table, storing fields like `guid`, `post_mime_type`, and `config`.

## Base URLs / URLs base

- Central: `http://<APP_URL>/v1/...`
- Tenant: `http://<APP_URL>/api/v1/...`

Choose the appropriate group depending on your deployment and multi-tenant configuration.

## Authentication / Autenticação

- Uses `auth:sanctum` for protected routes. Include `Authorization: Bearer <TOKEN>`.
- PT-BR: Gere um token via login para usar nas requisições.
- EN: Obtain a token via login and include it in requests.

## Activities (Document Upload) / Atividades (Upload de Documento)

Uploads via `ActivityController` quando `type_activities=document`.

- Endpoint: `POST /activities`
- Content-Type: `multipart/form-data`
- Body fields:
  - `title` (string, required)
  - `name` (string, optional; used for slug)
  - `type_activities` = `document` (required)
  - `type_duration` (string, optional)
  - `duration` (string, optional)
  - `description` (string, optional)
  - `active` (boolean, optional; default publish)
  - `file` (optional on create; if provided, stored and validated)
  - `file_storage_id` (optional; reference an existing file saved via File Storage)

Validation (Activity document uploads):

- `file`: `nullable|file|mimes:pdf,doc,docx,odt,txt|max:10240` (10 MB)
- `file_storage_id`: `nullable|integer` (must point to a valid `file_storage` record)

Response structure:

```json
{
  "id": 123,
  "title": "Apostila",
  "name": "apostila",
  "type_duration": "min",
  "type_activities": "document",
  "duration": "10",
  "content": null,
  "description": "Apostila do módulo",
  "active": true,
  "document": {
    "path": "activities/documents/<filename>",
    "url": "http://<APP_URL>/storage/activities/documents/<filename>",
    "original": "apostila.pdf",
    "mime": "application/pdf",
    "size": 102400
  },
  "created_at": "...",
  "updated_at": "..."
}
```

Other endpoints:

- `GET /activities` — list
- `GET /activities/{id}` — show
- `PUT/PATCH /activities/{id}` — update (file optional; replaces if provided)
- `DELETE /activities/{id}` — soft delete
- `GET /activities/trash` — list trashed
- `PUT /activities/{id}/restore` — restore
- `DELETE /activities/{id}/force` — permanent delete

## File Storage (Generic Upload) / Armazenamento de Arquivos (Genérico)

Uploads genéricos via `FileStorageController` com `post_type=file_storage`.

- Endpoint: `POST /file-storage`
- Content-Type: `multipart/form-data`
- Body fields:
  - `title` (string, optional; defaults to original filename without extension; duplicates allowed)
  - `name` (string, optional; used for slug)
  - `description` (string, optional)
  - `active` (boolean, optional; default publish)
  - `file` (file, required)

Validation (FileStorage):

- `file`: `required|file|max:20480` (20 MB)
- `title`: `nullable|string|max:255` (if omitted, backend uses original filename)
- PT-BR: Sem restrição de MIME por padrão. Ajuste para `mimes` se necessário.
- EN: No MIME restriction by default. Add `mimes` if your use-case requires.

Response structure:

```json
{
  "id": 456,
  "title": "Manual",
  "name": "manual-curso",
  "description": "Versão 2025",
  "active": true,
  "mime": "application/pdf",
  "url": "http://<APP_URL>/storage/file-storage/<filename>",
  "file": {
    "path": "file-storage/<filename>",
    "url": "http://<APP_URL>/storage/file-storage/<filename>",
    "original": "manual.pdf",
    "mime": "application/pdf",
    "size": 2097152,
    "ext": "pdf"
  },
  "created_at": "...",
  "updated_at": "..."
}
```

Other endpoints:

- `GET /file-storage` — list (filters: `q`, `title`, `mime`, `ext`, `active`)
- `GET /file-storage/{id}` — show
- `PUT/PATCH /file-storage/{id}` — update (file optional; replaces if provided)
- `DELETE /file-storage/{id}` — soft delete
- `GET /file-storage/trash` — list trashed
- `PUT /file-storage/{id}/restore` — restore
- `DELETE /file-storage/{id}/force` — permanent delete
- `GET /file-storage/{id}/download` — download with original filename

## Accessing Files / Acesso aos Arquivos

- Public URLs are exposed via `guid` and `config.file.url`.
- Files are stored on `public` disk and served at `/storage/...`.

Ensure storage symlink:

```bash
php artisan storage:link
```

`.env`:

- `FILESYSTEM_DISK=public`
- `APP_URL=http://127.0.0.1:8000` (adjust to your environment)

## CORS / CORS

For frontend uploads from another origin, configure `config/cors.php`:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173', 'http://<your-frontend-host>'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

## Errors / Erros

- `422` Validation error — returns `{ message, errors }`.
- `403` Access denied — missing/invalid token or permission.
- `404` Not found — resource not found or not in trash for restore/force.
- `409` Duplicate title — attempting to create with a title existing in trash.

## Examples (Windows curl) / Exemplos (Windows curl)

Activity Document Upload:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/activities" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "title=Apostila 1" \
  -F "name=apostila-1" \
  -F "type_activities=document" \
  -F "type_duration=min" \
  -F "duration=10" \
  -F "description=Apostila do módulo 1" \
  -F "active=true" \
  -F "file=@D:\\docs\\apostila.pdf"
```

Generic FileStorage Upload:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/file-storage" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "title=Manual do Curso" \
  -F "name=manual-curso" \
  -F "description=Versão 2025" \
  -F "active=true" \
  -F "file=@D:\\docs\\manual.pdf"
```

Filter listing by mime/ext/title:

```powershell
curl.exe -X GET "http://127.0.0.1:8000/api/v1/file-storage?mime=application/pdf&ext=pdf&title=Manual&active=true" \
  -H "Authorization: Bearer <TOKEN>"
```

Download by id with original filename:

```powershell
curl.exe -X GET "http://127.0.0.1:8000/api/v1/file-storage/123/download" \
  -H "Authorization: Bearer <TOKEN>" -o "Manual.pdf"
```

Reference a saved FileStorage in an Activity document:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/activities" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "title=Apostila Reutilizada" \
  -F "name=apostila-reuso" \
  -F "type_activities=document" \
  -F "description=Usando arquivo previamente salvo" \
  -F "file_storage_id=456"
```

## Frontend Tips / Dicas de Frontend

- Use `FormData` with `axios` and do not set `Content-Type` manually (let the browser set multipart boundaries).
- For Sanctum, if using cookies, ensure `withCredentials: true` and call `/sanctum/csrf-cookie` before POST.

---

Enhancements / Melhorias (optional):

- Enforce `mimes` on `FileStorageController` if business rules require.