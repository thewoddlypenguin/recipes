FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
# VITE_* vars are baked at build time; pass through build args if needed.
# VITE_BASE_PATH is the deployment sub-path (e.g. /recipes-staging/);
# it sets the Vite `base` and the API client's request prefix.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_BASE_PATH="/"
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ARG VITE_JUSTINSPACE_URL="https://justinmikkelsen.com"
ENV VITE_JUSTINSPACE_URL=$VITE_JUSTINSPACE_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80