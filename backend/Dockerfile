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

# Expose the port on which the application will run
EXPOSE 3000

# Start the application
CMD ["node", "-r", "./tracing.js", "app.js"]
