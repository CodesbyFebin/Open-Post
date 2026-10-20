# Open Post - Standalone Single Container Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (only express, cors, dotenv, node-cron)
RUN npm install --production

# Copy application files
COPY . .

# Expose server port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DRY_RUN=false

# Volume for persistent SQLite/JSON database storage
VOLUME ["/app/data"]

CMD ["npm", "start"]
