import React from 'react';
import { StepCliente } from './steps/StepCliente';
import { StepEntrega } from './steps/StepEntrega';
import { StepItens } from './steps/StepItens';
import { StepAjustes } from './steps/StepAjustes';
import { StepConfirmar } from './steps/StepConfirmar';
import type { NewOrderWizard } from './useNewOrderWizard';

export const NewOrderSteps: React.FC<{ wiz: NewOrderWizard }> = ({ wiz }) => {
  switch (wiz.step) {
    case 0:
      return <StepCliente storeSlug={wiz.storeSlug} customer={wiz.customer} onCustomerSelected={wiz.setCustomer} onCustomerCleared={() => wiz.setCustomer(null)} />;
    case 1:
      return <StepEntrega customer={wiz.customer} deliveryMethod={wiz.deliveryMethod} setDeliveryMethod={wiz.setDeliveryMethod} selectedAddress={wiz.selectedAddress} setSelectedAddress={wiz.setSelectedAddress} freeAddressText={wiz.freeAddressText} setFreeAddressText={wiz.setFreeAddressText} routeQuote={wiz.routeQuote} calculatingRoute={wiz.calculatingRoute} onCalculateRoute={wiz.handleCalculateRoute} enableScheduling={wiz.enableScheduling} setEnableScheduling={wiz.setEnableScheduling} scheduledDate={wiz.scheduledDate} setScheduledDate={wiz.setScheduledDate} scheduledTime={wiz.scheduledTime} setScheduledTime={wiz.setScheduledTime} />;
    case 2:
      return <StepItens storeId={wiz.productStoreKey} cart={wiz.cart} onAdd={wiz.addToCart} onQtyChange={wiz.changeQty} onRemove={wiz.removeFromCart} />;
    case 3:
      return <StepAjustes discountType={wiz.discountType} setDiscountType={wiz.setDiscountType} discountValue={wiz.discountValue} setDiscountValue={wiz.setDiscountValue} discountReason={wiz.discountReason} setDiscountReason={wiz.setDiscountReason} surchargeValue={wiz.surchargeValue} setSurchargeValue={wiz.setSurchargeValue} surchargeReason={wiz.surchargeReason} setSurchargeReason={wiz.setSurchargeReason} />;
    default:
      return <StepConfirmar cart={wiz.cart} deliveryMethod={wiz.deliveryMethod} deliveryAddress={wiz.freeAddressText} routeQuote={wiz.routeQuote} discountType={wiz.discountType} discountValue={wiz.discountValue} surchargeValue={wiz.surchargeValue} paymentMethod={wiz.paymentMethod} setPaymentMethod={wiz.setPaymentMethod} onEditItems={() => wiz.setStep(2)} suppressNotifications={wiz.suppressNotifications} setSuppressNotifications={wiz.setSuppressNotifications} />;
  }
};
