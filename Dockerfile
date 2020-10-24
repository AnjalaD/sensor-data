FROM node:12 as build

WORKDIR /app
COPY package*.json ./
RUN npm install --save-prod

COPY . .
EXPOSE 3000
ENV INTERVAL=1
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=root
ENV DB_PASSWORD=password
ENV DB_NAME=sensor-data
CMD ["node", "./bin/www"]