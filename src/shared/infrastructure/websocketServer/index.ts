import { Server } from "socket.io";
import { createServer } from "node:http";
import { logger } from "@shared/utils/logger";
import { executeAction } from "@shared/utils/executeAction.util";
import { params } from "@/src";
import { WebsocketServerType } from "./types";

class WebsocketServer {
  private io: WebsocketServerType;
  private httpServer;

  constructor() {
    this.httpServer = createServer();
    this.io = new Server<WebsocketServerType>(this.httpServer, {
      path: "/websocket",
      cors: {
        origin: "*", // Consider restricting this in production
        methods: ["GET", "POST"],
      },
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const { token } = socket.handshake.auth;

      if (!token || typeof token !== "string" || !token.startsWith("Bearer ")) {
        return next(new Error("Authentication error: Invalid token format"));
      }

      const actualToken = token.substring(7);

      if (actualToken === params.token) {
        return next();
      }
      return next(new Error("Authentication error: Unauthorized"));
    });

    this.setupEventHandlers();
  }

  public getWebsocketServer(): Server {
    return this.io;
  }

  private setupEventHandlers(): void {
    this.io.on("connection", socket => {
      logger.info(`✅ Worker watcher connected: ${socket.id}`);

      socket.on("disconnect", () => {
        logger.info(`⭕ Worker watcher disconnected: ${socket.id}`);
      });

      socket.on("error", error => {
        logger.error(
          `❌ Socket error for worker watcher ${socket.id}: ${error.message}`,
        );
      });

      // Add your custom event handlers here
    });
  }

  public async start(port: number): Promise<void> {
    return executeAction({
      action: () => this.startServer(port),
      actionName: "Websocket server initialization",
      retryDelay: 1000,
      maxRetries: 5,
      logging: true,
    });
  }

  private async startServer(port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.httpServer.listen(port, () => {
          logger.info(`🚀 Websocket server started on port ${port}`);
          resolve();
        });

        this.httpServer.on("error", error => {
          logger.error(`❌ Server error: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        logger.error(
          `❌ Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
        );
        reject(error);
      }
    });
  }

  public stop(): void {
    this.io.close(() => {
      logger.info("👋 Websocket server closed");
    });
    this.httpServer.close();
  }

  public getIo(): WebsocketServerType {
    return this.io;
  }
}

export { WebsocketServer };
