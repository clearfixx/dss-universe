/** Bounded durable discovery/publication/recovery. Broker messages are wake hints. */
import { Inject, Injectable } from '@nestjs/common';
import {
  GAMIFICATION_ADMISSION,
  GAMIFICATION_CONSUMPTION,
} from '../contracts/consumption.constants';
import type {
  GamificationAdmission,
  GamificationConsumption,
} from '../contracts/consumption.types';
import {
  GAMIFICATION_ROUTING_DISCOVERY,
  GAMIFICATION_ROUTING_PUBLICATION,
} from '../contracts/routing.constants';
import type {
  RoutingDiscovery,
  RoutingPublication,
} from '../contracts/routing.types';
import {
  GAMIFICATION_WAKE_INVENTORY,
  type WakeInventory,
  type WakeReference,
} from '../contracts/runtime.types';

export const GAMIFICATION_WAKE_QUEUE = Symbol('GAMIFICATION_WAKE_QUEUE');
export interface GamificationWakeQueue {
  publish(reference: WakeReference): Promise<void>;
}

@Injectable()
export class GamificationDeliveryPump {
  constructor(
    @Inject(GAMIFICATION_ROUTING_DISCOVERY)
    private readonly discovery: RoutingDiscovery,
    @Inject(GAMIFICATION_ROUTING_PUBLICATION)
    private readonly publication: RoutingPublication,
    @Inject(GAMIFICATION_ADMISSION)
    private readonly admission: GamificationAdmission,
    @Inject(GAMIFICATION_CONSUMPTION)
    private readonly consumption: GamificationConsumption,
    @Inject(GAMIFICATION_WAKE_INVENTORY)
    private readonly operations: WakeInventory,
    @Inject(GAMIFICATION_WAKE_QUEUE)
    private readonly queue: GamificationWakeQueue,
  ) {}
  async tick(): Promise<void> {
    await this.publication.recover();
    await this.consumption.recover();
    await this.discovery.forward();
    await this.discovery.reconcile();
    const claims = await this.publication.claim();
    for (const claim of claims) {
      const prepared = await this.admission.prepare(claim);
      if (prepared.status !== 'CREATED' && prepared.status !== 'REUSED')
        continue;
      try {
        // A receipt exists before enqueue. A lost wake is repaired by the
        // independent durable inventory below, even after queue acknowledgement.
        await this.queue.publish({
          admissionId: prepared.admission.admissionId,
          epoch: '0',
          sequence: '0',
        });
      } catch (error) {
        try {
          await this.publication.fail(claim);
        } catch {
          /* Lease recovery remains authoritative. */
        }
        throw error;
      }
      await this.publication.acknowledge(claim);
    }
    for (const reference of await this.operations.dueWakes())
      await this.queue.publish(reference);
  }
}
