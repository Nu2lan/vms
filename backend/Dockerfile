FROM node:20-alpine
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads

EXPOSE ${PORT:-5000}

CMD ["node", "app.js"]
