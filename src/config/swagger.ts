import { Express } from "express";
import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "DevWave Ecommerce API",
      version: "1.0.0",
      description: "API documentation for the DevWave Ecommerce platform",
    },
  },
  apis: [
    `./src/routes/*.ts`,
    `./src/routes/*.js`,

    `./src/config/swagger.ts`,
    `./src/config/swagger.js`,
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  // Serve the raw Swagger JSON
  app.get("/docs-json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Serve a custom Swagger UI HTML page (with CDN assets)
  app.get("/docs", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Docs</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
          <script>
            window.onload = function() {
              SwaggerUIBundle({
                url: '/docs-json',
                dom_id: '#swagger-ui',
                presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
                layout: "StandaloneLayout"
              });
            };
          </script>
        </body>
      </html>
    `);
  });
}
