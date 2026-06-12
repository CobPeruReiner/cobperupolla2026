FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_DEV_API_TARGET=http://localhost:4002
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_DEV_API_TARGET=${VITE_DEV_API_TARGET}

RUN npm run build

CMD ["sh", "-c", "echo Frontend construido con éxito && ls -lah /app/build"]
