VERSION := $(shell node -p "require('./frontend/package.json').version")

.PHONY: build dev

build:
	wails build -ldflags "-X main.version=$(VERSION)"

dev:
	wails dev -ldflags "-X main.version=$(VERSION)"
