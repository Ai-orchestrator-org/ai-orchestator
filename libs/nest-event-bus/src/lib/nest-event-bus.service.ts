import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEventBus } from '@ai-orchestrator/core-interfaces';

@Injectable()
export class NestEventBusService implements IEventBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(event: string, ...args: unknown[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  on(event: string, handler: (...args: unknown[]) => void): () => void {
    this.eventEmitter.on(event, handler);
    return () => {
      this.eventEmitter.off(event, handler);
    };
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, handler);
  }
}