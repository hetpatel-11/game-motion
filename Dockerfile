FROM node:22-alpine

WORKDIR /app

COPY game-mcp-app/package*.json ./

RUN npm install

COPY game-mcp-app/ ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
