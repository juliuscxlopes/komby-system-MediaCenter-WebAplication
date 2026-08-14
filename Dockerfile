FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# [AJUSTE] MapLibre GL resolve a URL do worker dele em runtime de um jeito
# que o Vite não detecta como asset (new URL com nome montado dinamicamente,
# não string literal) -- o arquivo nunca ia parar no build. Copiando pro
# public/ aqui ele sai no build final servido na raiz do site; MapComponent.tsx
# aponta o MapLibre pra ele explicitamente via setWorkerUrl(). maplibre-gl-shared.mjs
# vai junto -- é o chunk que o worker importa (código compartilhado com a lib principal).
RUN cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs public/
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]