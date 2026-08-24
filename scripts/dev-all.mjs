import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const web = spawn(
  process.execPath,
  [resolve("node_modules/vite/bin/vite.js"), "--host", "0.0.0.0"],
  { stdio: "inherit" },
);

const api = spawn(
  process.execPath,
  [
    "--require",
    resolve("server/node_modules/tsx/dist/preflight.cjs"),
    "--import",
    pathToFileURL(resolve("server/node_modules/tsx/dist/loader.mjs")).href,
    "src/index.ts",
  ],
  {
    cwd: resolve("server"),
    stdio: "inherit",
    env: {
      ...process.env,
      // Vite owns the root PORT. Keep the API on the port configured by its
      // proxy unless an explicit API_PORT override is supplied.
      PORT: process.env.API_PORT || "3200",
      NODE_ENV: process.env.NODE_ENV || "development",
      // The internal intake wizard has no sign-in screen. Only this local
      // development launcher enables its documented auth bypass; deployments
      // must provide a real Supabase session instead.
      DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS || "true",
    },
  },
);

function shutdown(signal) {
  web.kill(signal);
  api.kill(signal);
}

function shutdownOnFailure(child, name) {
  child.once("error", (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    shutdown("SIGTERM");
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (code !== 0 && signal === null) {
      console.error(`${name} stopped unexpectedly with exit code ${code}`);
      shutdown("SIGTERM");
      process.exitCode = code || 1;
    }
  });
}

shutdownOnFailure(web, "Web server");
shutdownOnFailure(api, "API server");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}
