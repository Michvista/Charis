# Use official Node.js 18 image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source
COPY . .

# Build the app using the existing TypeScript pipeline
RUN npm run build:tsc

# Expose the service port used by DolphJS
EXPOSE 3300

# Start the compiled service directly
CMD ["node", "app/server.js"]
