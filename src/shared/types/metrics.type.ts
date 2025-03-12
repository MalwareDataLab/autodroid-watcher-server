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
  workerName: string;
  procedureId: string;
  count: number;

  hostMetrics: Metrics | null;
  workerMetrics: Metrics | null;
  processingMetrics: {
    [key: string]: { processingId: string } & Metrics;
  };

  error: string | null;
  time: string;
};
