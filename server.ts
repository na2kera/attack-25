import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types/socket-events.js";
import { GameManager } from "./server/game-manager.js";
import { registerSocketHandlers } from "./server/socket-handlers.js";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: dev ? { origin: "*" } : undefined,
    }
  );

  const gameManager = new GameManager();
  registerSocketHandlers(io, gameManager);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`
    );
  });
});
