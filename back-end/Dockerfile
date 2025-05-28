# Étape 1 : Construire l'application
FROM maven:3.9.9-eclipse-temurin-24 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src /app/src
RUN mvn package -DskipTests

# Étape 2 : Image finale
FROM openjdk:24-jdk-slim


WORKDIR /app

COPY --from=build /app/target/lucid-arena-backend-0.0.1-SNAPSHOT.jar lucid-arena-backend.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "lucid-arena-backend.jar"]
