FROM node:20.18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV FRONTEND_BUILD_PATH=/app/build

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 4002

CMD ["npm", "start"]
