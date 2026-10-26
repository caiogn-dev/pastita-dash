import { lojaTemUber } from '../uberDaLoja';

describe('lojaTemUber', () => {
  it('só com opt-in explícito no metadata', () => {
    expect(lojaTemUber({ metadata: { uber_direct: true } })).toBe(true);
    expect(lojaTemUber({ metadata: { uber_direct: 'true' } })).toBe(false);
    expect(lojaTemUber({ metadata: {} })).toBe(false);
    expect(lojaTemUber({})).toBe(false);
    expect(lojaTemUber(undefined)).toBe(false);
  });
});
