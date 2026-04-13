import { EventEmitter } from "events";
import { EventMap, EventName } from "./eventTypes";
import { logger } from "../utils/logger";

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<K extends EventName>(event: K, data: EventMap[K]): void {
    this.emitter.emit(event, data);
  }

  on<K extends EventName>(event: K, handler: (data: EventMap[K]) => void): void {
    this.emitter.on(event, (data: EventMap[K]) => {
      try {
        handler(data);
      } catch (err) {
        // Isolate listener errors - don't let one listener break others
        logger.error({ err, event: String(event) }, "[EventBus] Error in handler");
      }
    });
  }

  off<K extends EventName>(event: K, handler: (data: EventMap[K]) => void): void {
    this.emitter.off(event, handler);
  }

  once<K extends EventName>(event: K, handler: (data: EventMap[K]) => void): void {
    this.emitter.once(event, handler);
  }
}

export const eventBus = new TypedEventBus();
