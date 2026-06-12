# Reporte de registros - Backend

Endpoint agregado:

```http
GET /api/polla/reporte-registros
```

Parámetros opcionales:

```text
q       = búsqueda por nombre, DNI o cargo
estado  = CONFIRMADO | BORRADOR | ANULADO
```

Ejemplos:

```http
GET /api/polla/reporte-registros
GET /api/polla/reporte-registros?q=45764572
GET /api/polla/reporte-registros?estado=CONFIRMADO
GET /api/polla/reporte-registros?q=sistemas&estado=CONFIRMADO
```

Respuesta resumida:

```json
{
  "ok": true,
  "message": "Reporte de registros cargado correctamente.",
  "data": {
    "evento": {},
    "resumen": {},
    "registros": []
  }
}
```

Archivos modificados:

```text
src/services/polla.service.js
src/controllers/polla.controller.js
src/routes/polla.routes.js
```
