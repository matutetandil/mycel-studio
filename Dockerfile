# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Build backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Final image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/backend/server .

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./static

ENV PORT=8080

EXPOSE 8080

CMD ["./server"]
