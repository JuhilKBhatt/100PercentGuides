# 100PercentageGuides

## Overview
A high-performance, modern mobile-first video game achievement and 100% completion guide platform.

## Architecture
- **Backend:** Java Spring Boot
- **Frontend:** Next.js
- **Database:** AWS DynamoDB
- **Cache:** Redis

## Setup Instructions

1. **Configure Secrets**
   Enter your API keys and configuration values in the `.env.dev` and `.env.prod` files located inside the `secrets/` directory. (Note: These files are ignored by git to protect your credentials).

2. **Run Development Environment**
   Start the services using Docker Compose:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

3. **Access the Applications**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8080`
   - Redis: `localhost:6379`
   - DynamoDB Local: `http://localhost:8000`

## Structure
- `/frontend`: Next.js application
- `/backend`: Spring Boot application
- `/secrets`: Configuration and keys
