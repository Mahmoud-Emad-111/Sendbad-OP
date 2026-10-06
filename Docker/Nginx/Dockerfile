# syntax=docker/dockerfile:1

FROM nginx:alpine

WORKDIR /var/www/html

COPY public /var/www/html/public

COPY Docker/Nginx/nginx.conf \
    /etc/nginx/conf.d/default.conf

RUN rm -rf /var/www/html/public/storage \
    && mkdir -p /var/www/html/public/storage

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
