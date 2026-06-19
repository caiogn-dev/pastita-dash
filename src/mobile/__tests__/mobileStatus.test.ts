import { nextOrderStatus, STATUS_LABEL } from '../mobileStatus';

test('advances pending -> confirmed', () => {
  expect(nextOrderStatus('pending')).toEqual({ status: 'confirmed', label: 'Confirmar' });
});

test('advances preparing -> ready', () => {
  expect(nextOrderStatus('preparing')).toEqual({ status: 'ready', label: 'Marcar pronto' });
});

test('returns null for a terminal status', () => {
  expect(nextOrderStatus('delivered')).toBeNull();
  expect(nextOrderStatus('cancelled')).toBeNull();
});

test('has a pt-BR label for known statuses', () => {
  expect(STATUS_LABEL.preparing).toBe('Em preparo');
});
