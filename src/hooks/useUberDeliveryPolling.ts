import { useState, useEffect, useCallback, useRef } from 'react';
import ordersService from '../services/orders';

interface Driver {
  name: string;
  phone: string;
  vehicle_info: string;
  eta_minutes: number;
  pickup_instructions?: string;
}

interface PollingState {
  status: 'searching' | 'driver_found' | 'no_drivers' | 'error';
  driver: Driver | null;
  error: string | null;
  secondsRemaining: number;
}

export const useUberDeliveryPolling = (orderId: number | string, storeSlug: string, isOpen: boolean) => {
  const [state, setState] = useState<PollingState>({
    status: 'searching',
    driver: null,
    error: null,
    secondsRemaining: 60
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const secondsRef = useRef(60);

  const createDeliveryRequest = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        status: 'searching',
        driver: null,
        error: null,
        secondsRemaining: 60
      }));
      secondsRef.current = 60;

      const response = await ordersService.createDeliveryRequest(storeSlug, orderId);

      if (!response.delivery_request_id) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'Failed to create delivery request'
        }));
        return;
      }

      startPolling();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create delivery request';
      console.error('Error creating delivery request:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }));
    }
  }, [orderId, storeSlug]);

  const startPolling = useCallback(() => {
    const pollDelivery = async () => {
      try {
        const response = await ordersService.pollDeliveryStatus(storeSlug, orderId);

        if (response.status === 'driver_found') {
          setState(prev => ({
            ...prev,
            status: 'driver_found',
            driver: response.driver,
            error: null
          }));
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        } else if (response.status === 'no_drivers') {
          setState(prev => ({
            ...prev,
            status: 'no_drivers',
            error: null
          }));
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to poll delivery status';
        console.error('Error polling delivery status:', err);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage
        }));
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };

    pollIntervalRef.current = setInterval(pollDelivery, 3000);
    pollDelivery();

    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setState(prev => {
        if (prev.status === 'searching') {
          return { ...prev, status: 'no_drivers' };
        }
        return prev;
      });
    }, 60000);
  }, [orderId, storeSlug]);

  const retryDelivery = useCallback(async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await createDeliveryRequest();
  }, [createDeliveryRequest]);

  const cancelDelivery = useCallback(async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      await ordersService.cancelDeliveryRequest(storeSlug, orderId);
    } catch (err) {
      console.error('Error canceling delivery:', err);
    }
  }, [orderId, storeSlug]);

  useEffect(() => {
    if (isOpen) {
      createDeliveryRequest();
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, createDeliveryRequest]);

  useEffect(() => {
    if (!isOpen) return;

    const countdownInterval = setInterval(() => {
      secondsRef.current -= 1;
      setState(prev => ({
        ...prev,
        secondsRemaining: Math.max(0, secondsRef.current)
      }));
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isOpen]);

  return {
    state,
    cancelDelivery,
    retryDelivery
  };
};
