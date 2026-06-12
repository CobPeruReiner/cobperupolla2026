# Polla COBPERU Frontend

Frontend React + Vite + TypeScript + Tailwind CSS.

Este proyecto está preparado para compilarse con Docker y entregar el build al backend Node/Express mediante un volumen compartido. No usa Nginx.

Comandos locales:

```bash
npm install
npm run dev
npm run build
```

El build de producción se genera en:

```text
build/
```

La API se consume desde:

```text
/api
```

En producción el backend sirve tanto el frontend como los endpoints `/api` desde el puerto `4002`.
