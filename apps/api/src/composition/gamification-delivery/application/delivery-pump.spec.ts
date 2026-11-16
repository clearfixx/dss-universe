import type {
  GamificationAdmission,
  GamificationConsumption,
} from '../contracts/consumption.types';
import type {
  RoutingDiscovery,
  RoutingPublication,
} from '../contracts/routing.types';
import { GamificationDeliveryPump } from './delivery-pump';
const claim = {
  eventId: 'event',
  claimToken: 'claim',
  cycle: 0,
  cycleAttempt: 1,
};
const wake = { admissionId: 'admission', epoch: '2', sequence: '8' };
function fixture() {
  const discovery: jest.Mocked<RoutingDiscovery> = {
    forward: jest.fn(),
    reconcile: jest.fn(),
  };
  const publication: jest.Mocked<RoutingPublication> = {
    claim: jest.fn().mockResolvedValue([claim]),
    acknowledge: jest.fn().mockResolvedValue(true),
    fail: jest.fn().mockResolvedValue(true),
    recover: jest.fn().mockResolvedValue(0),
  };
  const admission: jest.Mocked<GamificationAdmission> = {
    prepare: jest.fn().mockResolvedValue({
      status: 'CREATED',
      admission: {
        admissionId: 'admission',
        eventId: 'event',
        destination: 'gamification.v1',
        cutoff: '2026-11-16T00:00:00.000Z',
        descriptorId: 'news.publication',
        descriptorVersion: 1,
        codecVersion: 2,
      },
    }),
    rejectAdmission: jest.fn(),
  };
  const consumption: jest.Mocked<GamificationConsumption> = {
    claim: jest.fn(),
    load: jest.fn(),
    completeOwner: jest.fn(),
    continueOwner: jest.fn(),
    block: jest.fn(),
    fail: jest.fn(),
    recover: jest.fn().mockResolvedValue(0),
  };
  const inventory = { dueWakes: jest.fn().mockResolvedValue([wake]) };
  const queue = { publish: jest.fn().mockResolvedValue(undefined) };
  return {
    discovery,
    publication,
    admission,
    consumption,
    inventory,
    queue,
    service: new GamificationDeliveryPump(
      discovery,
      publication,
      admission,
      consumption,
      inventory,
      queue,
    ),
  };
}
describe('Durable gamification publication', () => {
  it('seals before enqueue and acknowledges only after queue acceptance', async () => {
    const f = fixture();
    await f.service.tick();
    expect(f.admission.prepare.mock.invocationCallOrder[0]).toBeLessThan(
      f.queue.publish.mock.invocationCallOrder[0],
    );
    expect(f.queue.publish.mock.invocationCallOrder[0]).toBeLessThan(
      f.publication.acknowledge.mock.invocationCallOrder[0],
    );
    expect(f.queue.publish).toHaveBeenLastCalledWith(wake);
    expect(f.consumption.claim.mock.calls).toHaveLength(0);
  });
  it('does not acknowledge a failed queue publication and preserves its failure', async () => {
    const f = fixture();
    const failure = new Error('synthetic queue add failure');
    f.queue.publish.mockRejectedValue(failure);
    await expect(f.service.tick()).rejects.toBe(failure);
    expect(f.publication.fail.mock.calls).toEqual([[claim]]);
    expect(f.publication.acknowledge.mock.calls).toHaveLength(0);
  });
  it('repairs durable wakes independently when there are no publication claims', async () => {
    const f = fixture();
    f.publication.claim.mockResolvedValue([]);
    await f.service.tick();
    expect(f.queue.publish).toHaveBeenCalledTimes(1);
    expect(f.queue.publish).toHaveBeenCalledWith(wake);
    expect(f.publication.recover.mock.calls).toHaveLength(1);
    expect(f.consumption.recover.mock.calls).toHaveLength(1);
  });
  it('does not publish rejected or stale admissions', async () => {
    const f = fixture();
    f.admission.prepare.mockResolvedValue({
      status: 'REJECTED',
      code: 'PRODUCER_EVIDENCE_MISSING',
    });
    f.inventory.dueWakes.mockResolvedValue([]);
    await f.service.tick();
    expect(f.queue.publish).not.toHaveBeenCalled();
    expect(f.publication.acknowledge.mock.calls).toHaveLength(0);
    expect(f.publication.fail.mock.calls).toHaveLength(0);
  });
});
