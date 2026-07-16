FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the app for production
RUN npm run build

EXPOSE 3005

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3005"]
