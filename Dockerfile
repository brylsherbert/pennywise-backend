FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 5001

CMD ["./docker-entrypoint.sh"]