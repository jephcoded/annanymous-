const http = require("http");
const fs = require("fs");
const path = require("path");

const isRender = Boolean(process.env.RENDER || process.env.PORT);
const host = process.env.ADMIN_WEB_HOST || (isRender ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || process.env.ADMIN_WEB_PORT || 62208);
const rootDir = path.resolve(__dirname, "..", "admin-web");
const defaultProxyBase = process.env.ADMIN_API_PROXY_BASE || "https://annanymous-o8qp.onrender.com";
const apiProxyBase = defaultProxyBase.replace(/\/$/, "");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const send = (response, statusCode, body, headers = {}) => {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(body);
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    request.on("error", reject);
  });

const proxyApiRequest = async (request, response, requestUrl) => {
  const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, `${apiProxyBase}/`);

  try {
    const body = await readRequestBody(request);
    const headers = { ...request.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const upstreamHeaders = {};
    upstreamResponse.headers.forEach((value, key) => {
      if (["connection", "content-encoding", "content-length", "keep-alive", "transfer-encoding"].includes(key.toLowerCase())) {
        return;
      }

      upstreamHeaders[key] = value;
    });

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    send(response, upstreamResponse.status, buffer, upstreamHeaders);
  } catch (error) {
    send(
      response,
      502,
      JSON.stringify({
        error: {
          code: "ADMIN_PROXY_FAILED",
          message: error instanceof Error ? error.message : "Proxy request failed",
          status: 502,
        },
      }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
  const requestedPath = decodeURIComponent(requestUrl.pathname || "/");

  if (request.method === "OPTIONS" && requestedPath.startsWith("/api/")) {
    send(response, 204, "", {
      "Access-Control-Allow-Origin": request.headers.origin || "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": request.headers["access-control-request-headers"] || "Content-Type, Authorization",
    });
    return;
  }

  if (requestedPath.startsWith("/api/")) {
    void proxyApiRequest(request, response, requestUrl);
    return;
  }

  const relativePath = requestedPath === "/" ? "/index.html" : requestedPath;
  let filePath = path.normalize(path.join(rootDir, relativePath));

  if (!filePath.startsWith(rootDir)) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const respondWithFile = (pathToRead) => {
    fs.readFile(pathToRead, (error, buffer) => {
      if (error) {
        if (error.code === "ENOENT") {
          const fallbackPath = path.join(rootDir, "index.html");

          if (!path.extname(relativePath)) {
            fs.readFile(fallbackPath, (fallbackError, fallbackBuffer) => {
              if (fallbackError) {
                send(response, 500, "Internal server error", { "Content-Type": "text/plain; charset=utf-8" });
                return;
              }

              send(response, 200, fallbackBuffer, {
                "Content-Type": "text/html; charset=utf-8",
              });
            });
            return;
          }

          send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
          return;
        }

        send(response, 500, "Internal server error", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }

      const extension = path.extname(pathToRead).toLowerCase();
      send(response, 200, buffer, {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
      });
    });
  };

  respondWithFile(filePath);
});

server.listen(port, host, () => {
  process.stdout.write(`Admin web ready at http://${host}:${port}\n`);
  process.stdout.write(`Admin API proxy target ${apiProxyBase}/api/v1\n`);
});

server.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});