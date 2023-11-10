import express, { Application } from "express";
import { Server as SocketIOServer, ServerOptions } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io: SocketIOServer;

  private readonly DEFAULT_PORT = 5000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    } as Partial<ServerOptions>);

    this.configureApp();
    this.configureRoutes();
    this.handleSocketConnection();
  }

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  private configureRoutes(): void {
    this.app.get("*", (req, res) => {
      res.status(404).send();
    });
  }

  private handleSocketConnection(): void {
    this.io.on("connection", (socket) => {
      let activeRoom = null;
      console.log(`Socket ${socket.id} connected.`);

      socket.on("join-room", (roomId: string) => {
        socket.join(roomId);
        console.log(`room ${roomId} joined by ${socket.id}`);
        console.log(
          `room ${roomId} contains ${Array.from(
            this.io.sockets.adapter.rooms.get(roomId),
          )}`,
        );
        activeRoom = roomId;
        socket.to(roomId).emit("user-list", {
          users: Array.from(this.io.sockets.adapter.rooms.get(roomId)),
        });
      });

      socket.on("call-user", (data: any) => {
        console.log("call-user", data);
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id,
        });
      });
      socket.on("ice", (data: any) => {
        console.log("ice", data);
        socket.to(data.to).emit("ice", {
          candidate: data.candidate,
          socket: socket.id,
        });
      });

      socket.on("make-answer", (data) => {
        console.log("make-answer", data);
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer,
        });
      });

      socket.on("reject-call", (data) => {
        console.log("reject-call", data);
        socket.to(data.from).emit("call-rejected", {
          socket: socket.id,
        });
      });

      socket.on("disconnect", () => {
        if (activeRoom) {
          socket.to(activeRoom).emit("remove-user", { socketId: socket.id });
        }
      });
    });
  }

  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }
}
