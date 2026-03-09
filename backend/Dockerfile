FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

EXPOSE 3000

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
