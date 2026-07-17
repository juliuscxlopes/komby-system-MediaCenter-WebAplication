# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Servir com Nginx
FROM nginx:alpine
# Copia o build da fase anterior para o diretório padrão do Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Remove o arquivo default e coloca uma config simples (opcional mas recomendado)
# Caso não tenha nginx.conf próprio no front, o padrão já serve na porta 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]