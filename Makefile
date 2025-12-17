# Makefile for RemoteDevAI
# Common commands for development, testing, and deployment

.PHONY: help install clean build dev test lint format docker-up docker-down docker-logs deploy-staging deploy-production

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)RemoteDevAI Makefile Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Setup & Installation:$(NC)"
	@echo "  make install          - Install all dependencies"
	@echo "  make setup            - Run initial setup script"
	@echo "  make clean            - Clean build artifacts and node_modules"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              - Start development servers"
	@echo "  make build            - Build all packages"
	@echo "  make watch            - Build and watch for changes"
	@echo "  make generate-types   - Generate TypeScript types from Prisma"
	@echo ""
	@echo "$(GREEN)Testing & Quality:$(NC)"
	@echo "  make test             - Run all tests"
	@echo "  make test-unit        - Run unit tests"
	@echo "  make test-integration - Run integration tests"
	@echo "  make test-e2e         - Run end-to-end tests"
	@echo "  make test-coverage    - Run tests with coverage"
	@echo "  make lint             - Run linter"
	@echo "  make lint-fix         - Run linter and fix issues"
	@echo "  make format           - Format code with Prettier"
	@echo "  make format-check     - Check code formatting"
	@echo "  make type-check       - Run TypeScript type checking"
	@echo ""
	@echo "$(GREEN)Docker:$(NC)"
	@echo "  make docker-up        - Start Docker services"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make docker-logs      - Show Docker logs"
	@echo "  make docker-clean     - Clean Docker volumes and images"
	@echo "  make docker-build     - Build Docker images"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database with test data"
	@echo "  make db-reset         - Reset database"
	@echo "  make db-studio        - Open Prisma Studio"
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@echo "  make deploy-staging   - Deploy to staging environment"
	@echo "  make deploy-production - Deploy to production environment"
	@echo ""

## install: Install all dependencies
install:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	npm install --workspaces
	@echo "$(GREEN)Dependencies installed!$(NC)"

## setup: Run initial setup script
setup:
	@echo "$(BLUE)Running setup script...$(NC)"
	@if [ -f "scripts/setup.sh" ]; then \
		bash scripts/setup.sh; \
	elif [ -f "scripts/setup.ps1" ]; then \
		pwsh scripts/setup.ps1; \
	else \
		echo "$(YELLOW)Setup script not found$(NC)"; \
	fi

## clean: Clean build artifacts and node_modules
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/.next
	rm -rf packages/*/build
	rm -rf .turbo
	@echo "$(GREEN)Clean complete!$(NC)"

## build: Build all packages
build:
	@echo "$(BLUE)Building all packages...$(NC)"
	npm run build
	@echo "$(GREEN)Build complete!$(NC)"

## dev: Start development servers
dev:
	@echo "$(BLUE)Starting development servers...$(NC)"
	npm run dev

## watch: Build and watch for changes
watch:
	@echo "$(BLUE)Building and watching for changes...$(NC)"
	npm run watch

## generate-types: Generate TypeScript types from Prisma
generate-types:
	@echo "$(BLUE)Generating TypeScript types...$(NC)"
	bash scripts/generate-types.sh
	@echo "$(GREEN)Types generated!$(NC)"

## test: Run all tests
test:
	@echo "$(BLUE)Running all tests...$(NC)"
	npm test

## test-unit: Run unit tests
test-unit:
	@echo "$(BLUE)Running unit tests...$(NC)"
	npm run test:unit

## test-integration: Run integration tests
test-integration:
	@echo "$(BLUE)Running integration tests...$(NC)"
	npm run test:integration

## test-e2e: Run end-to-end tests
test-e2e:
	@echo "$(BLUE)Running e2e tests...$(NC)"
	npm run test:e2e

## test-coverage: Run tests with coverage
test-coverage:
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:coverage

## lint: Run linter
lint:
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

## lint-fix: Run linter and fix issues
lint-fix:
	@echo "$(BLUE)Running linter and fixing issues...$(NC)"
	npm run lint:fix

## format: Format code with Prettier
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format

## format-check: Check code formatting
format-check:
	@echo "$(BLUE)Checking code formatting...$(NC)"
	npm run format:check

## type-check: Run TypeScript type checking
type-check:
	@echo "$(BLUE)Running type check...$(NC)"
	npm run type-check

## docker-up: Start Docker services
docker-up:
	@echo "$(BLUE)Starting Docker services...$(NC)"
	cd infra/docker && docker-compose up -d
	@echo "$(GREEN)Docker services started!$(NC)"

## docker-down: Stop Docker services
docker-down:
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	cd infra/docker && docker-compose down
	@echo "$(GREEN)Docker services stopped!$(NC)"

## docker-logs: Show Docker logs
docker-logs:
	@echo "$(BLUE)Showing Docker logs...$(NC)"
	cd infra/docker && docker-compose logs -f

## docker-clean: Clean Docker volumes and images
docker-clean:
	@echo "$(BLUE)Cleaning Docker volumes and images...$(NC)"
	cd infra/docker && docker-compose down -v
	docker system prune -f
	@echo "$(GREEN)Docker cleaned!$(NC)"

## docker-build: Build Docker images
docker-build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker build -f infra/docker/Dockerfile.cloud -t remotedevai/cloud:latest .
	docker build -f infra/docker/Dockerfile.desktop -t remotedevai/desktop:latest .
	@echo "$(GREEN)Docker images built!$(NC)"

## db-migrate: Run database migrations
db-migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	cd packages/cloud && npx prisma migrate deploy
	@echo "$(GREEN)Migrations complete!$(NC)"

## db-seed: Seed database with test data
db-seed:
	@echo "$(BLUE)Seeding database...$(NC)"
	cd packages/cloud && npx prisma db seed
	@echo "$(GREEN)Database seeded!$(NC)"

## db-reset: Reset database
db-reset:
	@echo "$(BLUE)Resetting database...$(NC)"
	cd packages/cloud && npx prisma migrate reset --force
	@echo "$(GREEN)Database reset!$(NC)"

## db-studio: Open Prisma Studio
db-studio:
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	cd packages/cloud && npx prisma studio

## deploy-staging: Deploy to staging environment
deploy-staging:
	@echo "$(BLUE)Deploying to staging...$(NC)"
	bash scripts/deploy-cloud.sh staging
	@echo "$(GREEN)Deployed to staging!$(NC)"

## deploy-production: Deploy to production environment
deploy-production:
	@echo "$(YELLOW)Deploying to production...$(NC)"
	@echo "$(YELLOW)WARNING: This will deploy to production. Are you sure? [y/N]$(NC)"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		bash scripts/deploy-cloud.sh production; \
		echo "$(GREEN)Deployed to production!$(NC)"; \
	else \
		echo "$(YELLOW)Deployment cancelled$(NC)"; \
	fi
