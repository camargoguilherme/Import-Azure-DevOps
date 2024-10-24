### STAGE 1: Build ###
FROM node:18-alpine AS build
WORKDIR /usr/src/app

ENV GENERATE_SOURCEMAP=false

COPY package*.json ./
COPY yarn.lock ./
RUN yarn install

COPY . .


RUN yarn build:web-prod


### STAGE 2: Run ###
FROM nginx:1.17.1-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/www /usr/share/nginx/html
