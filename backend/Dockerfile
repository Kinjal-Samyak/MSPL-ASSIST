# ---- Stage 1: build ---------------------------------------------------
# Mirrors DEPLOYMENT_GUIDE.md §2's manual build command exactly:
#   npm install --include=dev && npm run build:shared && cd backend &&
#   npm install --include=dev && npm run prisma:generate && npm run build
#
# --include=dev is required even though we set NODE_ENV=production, because
# a plain `npm install` under NODE_ENV=production skips devDependencies —
# which would strip out `typescript` (breaks `npm run build`) and the
# `prisma` CLI (breaks `prisma generate`).
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production

# Copy root + backend manifests first for better layer caching
COPY package*.json ./
COPY backend/package*.json backend/package*.json

# Copy the rest of the monorepo (needed for the shared package + prisma schema)
COPY . .

RUN npm install --include=dev
RUN npm run build:shared

WORKDIR /app/backend
RUN npm install --include=dev
RUN npm run prisma:generate
RUN npm run build

# ---- Stage 2: production runtime --------------------------------------
FROM node:20-alpine AS production
WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=build /app/backend/package*.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
# Only needed if the shared package is required at runtime (not just build
# time). Remove this line if backend/dist is fully self-contained.
COPY --from=build /app/packages ./../packages

EXPOSE 4000
CMD ["npm", "run", "start"]
