.PHONY: help setup start stop restart build logs status cleanup db-migrate backup init-db

.DEFAULT_GOAL := help

DOCKER_DIR := ./docker
BACKUP_DIR := ./backups
LOG_DIR := ./logs

GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

help: ## Show this help
	@echo "Thinkfinity - Development Environment"
	@echo "------------------------------------"
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

setup: ## Initial setup of the project
	@echo "$(GREEN)Setting up project...$(NC)"
	@mkdir -p $(DOCKER_DIR)/nginx $(DOCKER_DIR)/mysql/init $(DOCKER_DIR)/php $(DOCKER_DIR)/ssl $(BACKUP_DIR) $(LOG_DIR)
	@echo "$(GREEN)Creating required directories...$(NC)"
	@cp -n docker/php/php.ini $(DOCKER_DIR)/php/php.ini 2>/dev/null || true
	@cp -n docker/nginx/default.conf $(DOCKER_DIR)/nginx/default.conf 2>/dev/null || true
	@cp -n .env.example .env 2>/dev/null || true
	@echo "$(GREEN)Setup completed successfully!$(NC)"
	@echo "$(YELLOW)Run 'make build' to build the Docker containers.$(NC)"

build: ## Build Docker containers
	@echo "$(GREEN)Building Docker containers...$(NC)"
	docker-compose build
	@echo "$(GREEN)Build completed!$(NC)"
	@echo "$(YELLOW)Run 'make start' to start the containers.$(NC)"

start: ## Start Docker containers
	@echo "$(GREEN)Starting Docker containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Containers started successfully!$(NC)"
	@echo "$(YELLOW)Access the application at http://localhost$(NC)"
	@echo "$(YELLOW)Access phpMyAdmin at http://localhost:8080$(NC)"
	@echo "$(YELLOW)Access MinIO Console at http://localhost:9001$(NC)"
	@echo "$(YELLOW)Access Portainer at https://localhost:9443$(NC)"

stop: ## Stop Docker containers
	@echo "$(GREEN)Stopping Docker containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)Containers stopped successfully!$(NC)"

restart: stop start ## Restart Docker containers


logs: ## Show Docker container logs
	@echo "$(GREEN)Displaying logs...$(NC)"
	docker-compose logs -f

status: ## Show status of Docker containers
	@echo "$(GREEN)Container Status:$(NC)"
	docker-compose ps

db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker-compose exec web php /var/www/html/backend/migrate.php
	@echo "$(GREEN)Migrations completed!$(NC)"

backup: ## Backup database and storage
	@echo "$(GREEN)Creating backup...$(NC)"
	@mkdir -p $(BACKUP_DIR)/$(shell date +%Y-%m-%d)
	docker-compose exec -T mysql mysqldump -u root -p$(shell grep MYSQL_ROOT_PASSWORD .env | cut -d '=' -f2) thinfinity > $(BACKUP_DIR)/$(shell date +%Y-%m-%d)/thinfinity_db_$(shell date +%Y-%m-%d_%H-%M-%S).sql
	@echo "$(GREEN)Database backup created!$(NC)"
	@echo "$(YELLOW)Backup saved to $(BACKUP_DIR)/$(shell date +%Y-%m-%d)/$(NC)"

cleanup: ## Clean up unused Docker resources
	@echo "$(GREEN)Cleaning up Docker resources...$(NC)"
	docker system prune -f
	@echo "$(GREEN)Cleanup completed!$(NC)"

init-db: ## Initialize the database schema
	@echo "$(GREEN)Initializing database schema...$(NC)"
	@mkdir -p $(DOCKER_DIR)/mysql/init
	@echo "CREATE TABLE IF NOT EXISTS users (" > $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " uuid VARCHAR(50) NOT NULL UNIQUE," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " username VARCHAR(255) NOT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " email VARCHAR(255) NOT NULL UNIQUE," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "password VARCHAR(255) NOT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " profile_image VARCHAR(255) DEFAULT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo ");" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "CREATE TABLE IF NOT EXISTS sessions (" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " user_id BIGINT UNSIGNED NOT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " token VARCHAR(255) NOT NULL UNIQUE," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " expires_at TIMESTAMP NOT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo ");" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "CREATE TABLE IF NOT EXISTS user_profiles (" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " user_id BIGINT UNSIGNED NOT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " tagline VARCHAR(255) DEFAULT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " bio TEXT DEFAULT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo ");" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "CREATE TABLE IF NOT EXISTS user_settings (" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " user_id BIGINT UNSIGNED NOT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " full_name VARCHAR(255) DEFAULT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " phone VARCHAR(50) DEFAULT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " country VARCHAR(50) DEFAULT 'us'," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " education VARCHAR(50) DEFAULT 'high-school'," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " field_of_study VARCHAR(255) DEFAULT NULL," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " theme VARCHAR(20) DEFAULT 'light'," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " font_size INT DEFAULT 100," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " accent_color VARCHAR(20) DEFAULT '#4a6cf7'," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo " updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo ");" >> $(DOCKER_DIR)/mysql/init/01-schema.sql
	@echo "$(GREEN)Database schema initialized!$(NC)"