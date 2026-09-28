FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
COPY database database
RUN npm run build -w apps/api
USER node
EXPOSE 3000
CMD ["sh","-c","npm run migrate -w apps/api && npm run seed -w apps/api && npm start -w apps/api"]
