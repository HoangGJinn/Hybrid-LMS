# Stage 1: Base image
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Install dependencies and build project
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=9595

RUN chown -R node:node /app

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/ca.pem ./ca.pem

RUN mkdir -p logs && chown -R node:node logs

USER node

EXPOSE 9595
CMD ["node", "dist/main.js"]