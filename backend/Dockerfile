FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Environment defaults
ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "start"]
