FROM eclipse-temurin:17-jdk-jammy AS base
WORKDIR /app

# Development stage (uses Maven directly)
FROM base AS development
CMD ["./mvnw", "spring-boot:run", "-Dspring-boot.run.jvmArguments='-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005'"]

# Build stage
FROM base AS build
COPY . .
RUN ./mvnw clean package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre-jammy AS production
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
