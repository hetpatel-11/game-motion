FROM node:22-alpine

WORKDIR /app

COPY remotion-mcp-app/package*.json ./

RUN npm install

COPY remotion-mcp-app/ ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
