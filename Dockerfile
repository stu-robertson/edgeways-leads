FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverage Docker caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application
RUN npm run build

EXPOSE 3000

# Start the application
CMD ["npm", "start"]
