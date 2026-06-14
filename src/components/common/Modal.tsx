/**
 * Re-export of the canonical Modal implementation in ../ui/modal.
 * Single source of truth lives there. This file exists only for backward
 * compatibility with the many consumers that import from common/.
 */
export {
  Modal,
  ConfirmModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  default,
} from '../ui/modal';
export type {
  ModalProps,
  ModalHeaderProps,
  ConfirmModalProps,
} from '../ui/modal';
