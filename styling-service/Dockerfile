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
RUN npm run build

# Expose the service port used by DolphJS
EXPOSE 3300

# Start the service
CMD ["npm", "start"]
