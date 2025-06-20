# Use official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of your app
COPY . .

# Build TypeScript
RUN yarn build

# Set default command — update if your app has a specific entry point
CMD ["node", "dist/index.js"]
