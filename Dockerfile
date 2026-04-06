FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --no-optional

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
