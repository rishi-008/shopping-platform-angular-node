# Build Angular app
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
	&& if [ -f dist/web/browser/index.html ]; then cp -a dist/web/browser/. dist/web/; fi

# Serve with nginx
FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/ /usr/share/nginx/html/

EXPOSE 80
