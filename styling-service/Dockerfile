# Use official Node.js 18 image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production

# Copy source
COPY . .

# Build the app (Dolph build expected to write into app/ folder)
RUN npm run build || true

# Expose port Dolph uses (default 3000)
EXPOSE 3000

# Start the service
CMD ["npm", "start"]
