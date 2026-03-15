# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Build backend
FROM golang:1.22-alpine AS backend-builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ ./cmd/
COPY parser/ ./parser/
COPY handlers/ ./handlers/
COPY models/ ./models/
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Final image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/server .

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./static

ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
