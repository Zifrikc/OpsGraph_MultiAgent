export type Scenario = "healthy" | "timeout" | "deployment";
export type Phase =
  "idle" | "processing" | "approved" | "incident" | "resolved";
export type DemoEvent = {
  id: string;
  timestamp: string;
  type: string;
  service: string;
  traceId: string;
  data: Record<string, unknown>;
};
export const services = [
  {
    id: "api-gateway",
    label: "API Gateway",
    kind: "Entrada",
    x: 150,
    y: 230,
    owner: "Platform",
    latency: 24,
  },
  {
    id: "authentication-service",
    label: "Authentication",
    kind: "Identidad",
    x: 340,
    y: 90,
    owner: "Platform",
    latency: 18,
  },
  {
    id: "order-service",
    label: "Orders",
    kind: "Comercio",
    x: 340,
    y: 300,
    owner: "Commerce",
    latency: 42,
  },
  {
    id: "payment-service",
    label: "Payments",
    kind: "Pagos",
    x: 540,
    y: 230,
    owner: "Payments",
    latency: 65,
  },
  {
    id: "fraud-detection-service",
    label: "Fraud detection",
    kind: "Riesgo",
    x: 540,
    y: 440,
    owner: "Risk",
    latency: 32,
  },
  {
    id: "bank-connector",
    label: "Bank connector",
    kind: "Proveedor externo",
    x: 760,
    y: 150,
    owner: "Payments",
    latency: 86,
  },
  {
    id: "transaction-database",
    label: "Transactions DB",
    kind: "Persistencia",
    x: 760,
    y: 340,
    owner: "Data",
    latency: 12,
  },
  {
    id: "notification-service",
    label: "Notifications",
    kind: "Mensajería",
    x: 340,
    y: 490,
    owner: "Platform",
    latency: 21,
  },
];
export const scenarioLabels: Record<Scenario, string> = {
  healthy: "Pago exitoso",
  timeout: "Timeout del banco",
  deployment: "Cambio reciente + timeout",
};
