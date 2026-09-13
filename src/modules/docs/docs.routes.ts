import { Router } from "express";
import { buildOpenApiDocument } from "../../lib/openapi.js";

export const docsRouter = Router();

let cached: ReturnType<typeof buildOpenApiDocument> | null = null;

docsRouter.get("/docs/openapi.json", (_req, res) => {
  cached ??= buildOpenApiDocument();
  res.json(cached);
});

docsRouter.get("/docs", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Al-Saedy Optics API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/docs/openapi.json",
      dom_id: "#swagger-ui",
      persistAuthorization: true,
      docExpansion: "list",
      tagsSorter: "alpha",
    });
  </script>
</body>
</html>`);
});
