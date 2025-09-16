# Start from the official Go image
FROM golang:1.23-alpine

# Set working directory inside the container
WORKDIR /app

# Install git, ca-certificates and build tools
RUN apk add --no-cache git ca-certificates tzdata

# Copy go.mod and go.sum
COPY go.mod go.sum ./

# Set Go environment variables for better module handling
ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOOS=linux

# Download dependencies with verbose output for debugging
RUN go mod download -x

# Verify dependencies
RUN go mod verify

# Copy the rest of your code
COPY . .

# Build the Go app with static linking
RUN go build -a -installsuffix cgo -o server main.go

# Expose port
EXPOSE 8080

# Run the executable
CMD ["./server"]
