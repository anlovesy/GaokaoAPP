FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/.env.example ./.env.example
EXPOSE 3001
CMD ["node", "apps/api/index.js"]
