import { getAllData } from "systeminformation";

export type Metrics = {
  name: string;
  type: "host" | "container";
  cpu: {
    usedPercentage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usedPercentage: number;
  };
};

export type MetricsReport = {
  watcherName: string;
  procedureId: string;
  count: number;

  hostMetrics: Metrics | null;
  workerMetrics: Metrics | null;
  processingMetrics: {
    [key: string]: { processingId: string; workerName: string } & Metrics;
  };

  error: string | null;
  time: string;
};

export type SystemInformationData = Awaited<ReturnType<typeof getAllData>> & {
  watcherName: string;
  procedureId: string;
};
