# Reporte de registros - Frontend

Vista agregada:

```text
/#/reporte
```

También se puede entrar desde el botón **Reporte de registros** en el formulario principal.

Endpoint usado:

```http
GET /api/polla/reporte-registros
```

Archivos modificados/agregados:

```text
src/App.tsx
src/components/ReporteRegistrosView.tsx
src/services/pollaApi.ts
src/types/polla.ts
src/utils/format.ts
```

La variable de entorno del frontend se mantiene igual:

```env
VITE_API_BASE_URL=/api
```

Para reconstruir en servidor:

```bash
docker compose up --build -d
```
