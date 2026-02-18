# Build stage (context is repo root when built via docker-compose)
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files first for better layer caching
COPY src/NetWorthNavigator.Frontend/package.json src/NetWorthNavigator.Frontend/package-lock.json ./
RUN npm ci

# Copy frontend source and build
COPY src/NetWorthNavigator.Frontend/ ./
RUN npm run build -- --configuration=production

# Runtime: nginx to serve static files
FROM nginx:alpine AS final
RUN rm -f /etc/nginx/conf.d/default.conf
COPY src/NetWorthNavigator.Frontend/nginx.conf /etc/nginx/conf.d/default.conf
# Angular 19 application builder outputs to dist/<project>/browser
COPY --from=build /app/dist/networth-navigator-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
