import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Event, InventoryService } from '../../src/events.js';

/** Cucumber World for the inventory service scenarios. */
export class InventoryWorld extends World {
  /** Service under test, created by the Background/Given step. */
  service: InventoryService | undefined;
  /** Events returned by the most recent `handle` call. */
  emitted: Event[] = [];
  /** Every event emitted so far in the scenario, in order. */
  all: Event[] = [];
  /** The most recent incoming event, so "the same event" can be redelivered. */
  lastIncoming: Event | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }

  requireService(): InventoryService {
    if (!this.service) throw new Error('inventory service has not been created in this scenario');
    return this.service;
  }

  deliver(event: Event): Event[] {
    this.lastIncoming = event;
    this.emitted = this.requireService().handle(event);
    this.all.push(...this.emitted);
    return this.emitted;
  }
}

setWorldConstructor(InventoryWorld);
