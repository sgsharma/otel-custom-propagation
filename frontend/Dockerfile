# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the application code
COPY . .

# Build the React app
RUN npm run build

# Expose the port on which the application will run
EXPOSE 80

# Start a simple HTTP server to serve the built React app
CMD ["npx", "serve", "-s", "build", "-l", "80"]
