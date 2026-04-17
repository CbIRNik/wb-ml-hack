FROM node:20-slim

WORKDIR /app
COPY package.json bun.lock ./
RUN npm install

COPY . .

ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_USE_MOCK_API=false

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
