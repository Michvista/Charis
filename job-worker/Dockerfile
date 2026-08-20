FROM node:20-alpine

RUN apk add --no-cache ca-certificates && update-ca-certificates

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
