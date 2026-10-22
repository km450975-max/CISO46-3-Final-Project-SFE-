import { EventEmitter } from 'events';

/**
 * In-process event bus.
 *
 * EventEmitter keeps producers and handlers separate, but it is not a durable
 * queue. Listeners run only while this Node process is alive. A restart drops
 * events that have not been handled. Score-changing handlers are awaited before
 * the HTTP response is sent, and the unique attempt index prevents a retry from
 * awarding points twice.
 *
 * A later version can publish the same event names through a transactional
 * outbox: write the event in the same database commit as the attempt, then have
 * a worker deliver it to a queue such as RabbitMQ or SQS.
 */
class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(40);
  }

  async dispatch(eventName, payload = {}) {
    const event = {
      ...payload,
      eventName,
      occurredAt: new Date().toISOString(),
    };
    const listeners = this.listeners(eventName);
    const results = [];
    for (const listener of listeners) {
      results.push(await listener(event));
    }
    return results;
  }
}

export const eventBus = new AppEventBus();
