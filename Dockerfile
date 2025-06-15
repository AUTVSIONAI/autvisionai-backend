# AUTVISION Backend Dockerfile
FROM node:20-alpine AS builder

# Instala dependências básicas
RUN apk add --no-cache libc6-compat

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production

# Copia código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS runner

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 autvision

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos do build
COPY --from=builder --chown=autvision:nodejs /app/dist ./dist
COPY --from=builder --chown=autvision:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=autvision:nodejs /app/package.json ./package.json

# Expõe a porta
EXPOSE 3001

# Muda para usuário não-root
USER autvision

# Comando de início
CMD ["node", "dist/index.js"]

# Labels para metadata
LABEL maintainer="AUTVISION Team"
LABEL version="1.0.0"
LABEL description="Backend modular para AUTVISION AI"
