import { Server } from "socket.io";
import {
  MetricsReport,
  SystemInformationData,
} from "@shared/types/metrics.type";

export interface ServerToClientEvents {
  pong: () => void;

  start: (data: { procedureId: string }) => void;
  stop: (data: { procedureId: string }) => void;
}

export interface ClientToServerEvents {
  ping: () => void;

  report: (data: MetricsReport) => void;
  systemInformation: (data: SystemInformationData) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  token: string;
}

export type WebsocketServerType = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
