export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  constructor(private namespace: string, private enabled = false) {}

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  log(level: LogLevel, message: string, extra?: unknown) {
    if (!this.enabled && level === "debug") {
      return;
    }
    const prefix = `[ISU:${this.namespace}]`;
    if (extra !== undefined) {
      console[level === "debug" ? "log" : level](prefix, message, extra);
    } else {
      console[level === "debug" ? "log" : level](prefix, message);
    }
  }

  debug(message: string, extra?: unknown) {
    this.log("debug", message, extra);
  }

  info(message: string, extra?: unknown) {
    this.log("info", message, extra);
  }

  warn(message: string, extra?: unknown) {
    this.log("warn", message, extra);
  }

  error(message: string, extra?: unknown) {
    this.log("error", message, extra);
  }
}
