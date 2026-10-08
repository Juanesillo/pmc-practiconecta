FROM node:24-alpine
ENV NODE_ENV=production TZ=America/Bogota PORT=3000 DB_PATH=/data/pmc.db
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY public ./public
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "server/index.js"]
