# Stage 1: builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# bcrypt compila binding nativo no install — precisa de toolchain no Alpine.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json puppeteer.config.cjs ./
# postinstall (ensure-chromium) sai imediatamente com PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY scripts/ensure-chromium.js scripts/
RUN npm ci

COPY . .

# Stage 2: production
FROM node:20-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

# dumb-init adicionado à instalação.
# Chromium do sistema para puppeteer-core (binário real em /usr/lib/chromium/chromium)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

ENV PUPPETEER_EXECUTABLE_PATH=/usr/lib/chromium/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV AXE_ENABLED=true

# Copia dependências, código fonte e definições de pacote do builder
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src

# Se houver config files como swagger ou database no src eles já foram copiados.
# Mudar permissões para o usuário não-privilegiado "node"
RUN chown -R node:node /usr/src/app

USER node

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]