import { useState, useEffect, useCallback, useRef } from 'react';
import * as orderApi from '../services/orders';

export const useUberDeliveryPolling = (orderId, storeSlug, isOpen) => {
  const [state, setState] = useState({
    status: 'searching', // 'searching', 'driver_found', 'no_drivers', 'error'
    driver: null,
    error: null,
    secondsRemaining: 60
  });

  const pollIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
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

      const response = await orderApi.createDeliveryRequest(storeSlug, orderId);

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
      console.error('Error creating delivery request:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || 'Failed to create delivery request'
      }));
    }
  }, [orderId, storeSlug]);

  const startPolling = useCallback(() => {
    const pollDelivery = async () => {
      try {
        const response = await orderApi.pollDeliveryStatus(storeSlug, orderId);

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
        console.error('Error polling delivery status:', err);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: err.message || 'Failed to poll delivery status'
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
      await orderApi.cancelDeliveryRequest(storeSlug, orderId);
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
    const countdownInterval = setInterval(() => {
      secondsRef.current -= 1;
      setState(prev => ({
        ...prev,
        secondsRemaining: Math.max(0, secondsRef.current)
      }));
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  return {
    state,
    cancelDelivery,
    retryDelivery
  };
};
