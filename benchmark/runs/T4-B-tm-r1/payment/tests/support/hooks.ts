// cucumber-js constructs a fresh PaymentWorld for every scenario, so state never leaks
// between scenarios. This Before hook only makes that isolation explicit and guards
// against a future change that might share a World instance.
import { Before } from '@cucumber/cucumber';
import type { PaymentWorld } from './world.js';

Before(function (this: PaymentWorld) {
  this.service = undefined;
  this.inbound = [];
  this.lastEvents = [];
  this.allEvents = [];
});
