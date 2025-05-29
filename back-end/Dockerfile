# Étape 1 : Construire l'application
FROM maven:3.9.9-eclipse-temurin-24 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src /app/src
RUN mvn package -DskipTests

# Étape 2 : Image finale
FROM openjdk:24-jdk-slim

# Déclarez des ARG pour pouvoir les passer au build
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET

# Exportez-les ensuite en ENV pour que Spring les récupère
ENV spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
ENV spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
ENV spring.security.oauth2.resourceserver.jwt.secret=${GOOGLE_CLIENT_SECRET}

WORKDIR /app

COPY --from=build /app/target/lucid-arena-backend-0.0.1-SNAPSHOT.jar lucid-arena-backend.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "lucid-arena-backend.jar"]


