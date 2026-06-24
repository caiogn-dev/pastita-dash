import { TIME_SLOTS, isValidSlot } from '../schedulingSlots';

describe('schedulingSlots', () => {
  it('exposes ordered hourly slots', () => {
    expect(TIME_SLOTS.length).toBeGreaterThan(0);
    expect(TIME_SLOTS[0]).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/);
  });
  it('validates slot membership', () => {
    expect(isValidSlot(TIME_SLOTS[0])).toBe(true);
    expect(isValidSlot('99:00-99:00')).toBe(false);
  });
});
