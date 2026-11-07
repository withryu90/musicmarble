FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json index.html ./
COPY --chown=node:node src ./src
COPY --chown=node:node server ./server
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5173
EXPOSE 5173
CMD ["node", "server/server.js"]
