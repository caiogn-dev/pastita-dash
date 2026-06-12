import { isAgentOnline } from '../agentStatus';

const NOW = new Date('2026-06-11T12:00:00Z');

describe('isAgentOnline', () => {
  it('online se heartbeat há menos de 90s', () => {
    expect(isAgentOnline('2026-06-11T11:59:00Z', NOW)).toBe(true);
  });

  it('offline se heartbeat há mais de 90s', () => {
    expect(isAgentOnline('2026-06-11T11:58:00Z', NOW)).toBe(false);
  });

  it('offline sem heartbeat', () => {
    expect(isAgentOnline(null, NOW)).toBe(false);
    expect(isAgentOnline(undefined, NOW)).toBe(false);
  });
});
