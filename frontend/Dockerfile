# ── Stage 1 : build React ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

ARG REACT_APP_API_URL=/api
ARG REACT_APP_SOCKET_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

RUN npm run build

# ── Stage 2 : serve via Apache ─────────────────────────────────
FROM httpd:2.4-alpine

# Activer les modules proxy
RUN sed -i \
  -e 's/#LoadModule proxy_module/LoadModule proxy_module/' \
  -e 's/#LoadModule proxy_http_module/LoadModule proxy_http_module/' \
  -e 's/#LoadModule proxy_wstunnel_module/LoadModule proxy_wstunnel_module/' \
  -e 's/#LoadModule rewrite_module/LoadModule rewrite_module/' \
  /usr/local/apache2/conf/httpd.conf

COPY --from=builder /app/build /usr/local/apache2/htdocs/
COPY apache.conf /usr/local/apache2/conf/extra/snapgram.conf

RUN echo "Include conf/extra/snapgram.conf" >> /usr/local/apache2/conf/httpd.conf

EXPOSE 80
CMD ["httpd-foreground"]