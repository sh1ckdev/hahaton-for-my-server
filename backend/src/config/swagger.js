import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Rational Assistant API",
      version: "1.0.0",
      description: "API для финансового ассистента - управления покупками, настройками уведомлений и правил охлаждения",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000",
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"], // пути к файлам с аннотациями
};

export const swaggerSpec = swaggerJsdoc(options);

