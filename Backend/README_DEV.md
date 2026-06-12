# Backend Polla COBPERU

Backend Node.js + Express + Sequelize para la Polla COBPERU Fase Previa.

## Desarrollo local

Crear `.env` usando `.env.example` como base.

```bash
npm install
npm run dev
```

API local:

```text
http://localhost:4002/api/health
http://localhost:4002/api/polla/catalogo
http://localhost:4002/api/polla/resumen
```

## Producción con Docker

El backend está preparado para servir el build del frontend desde:

```text
/app/build
```

Ese path se monta desde un volumen compartido con el contenedor del frontend.

Build:

```bash
docker build -t cobperu-polla-backend .
```

Run manual:

```bash
docker run -d \
  --name cobperu-polla-backend \
  -p 4002:4002 \
  --env-file .env.production \
  -v frontend-build:/app/build \
  cobperu-polla-backend
```

## Variables principales

```env
PORT=4002
NODE_ENV=production
FRONTEND_URL=http://192.168.1.67:4002
FRONTEND_BUILD_PATH=/app/build

DB_HOST4=192.168.1.31
DB_USER4=usuario
DB_PASSWORD4=password
DB4=SISTEMAGEST
```

## Endpoints

```text
GET  /api/health
GET  /api/polla/catalogo
GET  /api/polla/resumen
GET  /api/polla/ranking
GET  /api/polla/pronostico/:dni
POST /api/polla/pronostico
```

## Respuestas amigables

Todas las respuestas siguen este formato:

```json
{
  "ok": true,
  "message": "Mensaje amigable para mostrar al usuario",
  "data": {}
}
```

En errores:

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "Revisa los datos ingresados. Hay campos pendientes o con formato incorrecto.",
  "errors": []
}
```

## Logs

En desarrollo se muestran logs DEBUG. En producción solo se muestran INFO/WARN/ERROR, salvo que se active:

```env
DEBUG_LOGS=true
```

## Importante

No subir `.env` ni `.env.production` al repositorio. Estos archivos están excluidos del Docker build y del `.gitignore`.
