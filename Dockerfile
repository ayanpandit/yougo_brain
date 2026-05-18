# --- Build Stage ---
FROM node:24.14.0-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS production bundle
RUN npm run build

# --- Production Runner Stage ---
FROM node:24.14.0-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./

# Only install production dependencies to keep image extremely lightweight
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prompts ./prompts

EXPOSE 8001

ENV NODE_ENV=production

CMD ["node", "dist/main"]
