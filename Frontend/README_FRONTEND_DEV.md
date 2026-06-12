# Frontend Polla COBPERU

Frontend React + Vite + TypeScript + Tailwind CSS para la Polla COBPERU Fase Previa.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre:

```text
http://localhost:5173
```

En desarrollo, Vite redirige `/api` hacia el backend local:

```text
http://localhost:4002
```

Esto se configura en `vite.config.ts` con `VITE_DEV_API_TARGET`.

## Producción con Docker sin Nginx

Este frontend NO sirve contenido por sí mismo. Solo compila el build de Vite dentro de:

```text
/app/build
```

Ese directorio debe compartirse por volumen con el backend. El backend Node/Express es quien sirve el frontend final.

## Variables

Para producción se recomienda usar:

```env
VITE_API_BASE_URL=/api
```

Importante: en Vite, las variables `VITE_*` se aplican en tiempo de compilación, no en tiempo de ejecución. Por eso en Docker Compose conviene pasarlas como `build.args`.

## Dockerfile

El Dockerfile genera el build y termina el contenedor con un mensaje:

```bash
docker build -t polla-cobperu-frontend .
```

## Docker Compose sugerido en la raíz del proyecto

La estructura esperada es:

```text
cobperupolla2026/
├── Backend/
├── Frontend/
└── docker-compose.yml
```

Ejemplo:

```yaml
services:
  frontend:
    image: cobperureiner/polla-cobperu-frontend:latest
    build:
      context: ./Frontend
      args:
        VITE_API_BASE_URL: /api
    volumes:
      - frontend-build:/app/build

  backend:
    image: cobperureiner/polla-cobperu-backend:latest
    build:
      context: ./Backend
    env_file:
      - ./Backend/.env.production
    environment:
      FRONTEND_BUILD_PATH: /app/build
    volumes:
      - frontend-build:/app/build
    depends_on:
      - frontend
    ports:
      - "4002:4002"

volumes:
  frontend-build:
```

Luego levanta:

```bash
docker compose up -d --build
```

Validar:

```text
http://192.168.1.67:4002/
http://192.168.1.67:4002/api/health
http://192.168.1.67:4002/api/polla/catalogo
```

## Archivos que ya no se usan

Borrar si existen en tu carpeta local:

```text
nginx.conf
dist/
build/
node_modules/
```

`node_modules/` se puede borrar antes de comprimir o subir al servidor, porque se reconstruye con `npm ci`.
