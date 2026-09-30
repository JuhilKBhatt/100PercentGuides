FROM eclipse-temurin:17-jdk-jammy AS base
WORKDIR /app

# Development stage (uses Maven directly)
FROM base AS development
CMD ["./mvnw", "spring-boot:run", "-Dspring-boot.run.jvmArguments='-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005'"]

# Build stage
FROM base AS build
COPY . .
RUN ./mvnw clean package -DskipTests

# Production stage (runs securely as non-root user)
FROM eclipse-temurin:17-jre-jammy AS production
WORKDIR /app
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar
USER appuser
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
