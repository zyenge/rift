FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy Prisma CLI (devDep) and generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
