# Use official Node.js runtime as a parent image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NITRO_PRESET=node-server
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set the host so it can be accessed from outside the container
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the application using Nitro output
CMD ["node", ".output/server/index.mjs"]
