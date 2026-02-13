/**
 * UI Components - Modern, accessible, and animated
 * 
 * Usage:
 * import { Button, Card, Input, Badge, Modal, Skeleton, Toast, Dropdown } from '@/components/ui';
 */

// Button
export { Button, type ButtonProps } from './button';

// Card
export { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter, 
  StatCard,
  type CardProps,
  type CardHeaderProps,
  type StatCardProps,
} from './card';

// Input
export { 
  Input, 
  SearchInput,
  type InputProps,
  type SearchInputProps,
} from './input';

// Badge
export { 
  Badge, 
  StatusBadge, 
  CountBadge,
  type BadgeProps,
  type StatusBadgeProps,
  type CountBadgeProps,
} from './badge';

// Modal
export { 
  Modal, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  ConfirmModal,
  type ModalProps,
  type ModalHeaderProps,
  type ConfirmModalProps,
} from './modal';

// Skeleton
export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonTableRow,
  SkeletonStats,
  SkeletonMessage,
  type SkeletonProps,
  type SkeletonAvatarProps,
} from './skeleton';

// Toast
export {
  Toast,
  ToastContainer,
  type ToastProps,
  type ToastVariant,
  type ToastContainerProps,
} from './toast';

// Dropdown
export {
  Dropdown,
  DropdownButton,
  type DropdownProps,
  type DropdownItem,
  type DropdownButtonProps,
} from './dropdown';

// Dialog (Modal wrapper)
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  type DialogProps,
} from './dialog';

// Label
export {
  Label,
  type LabelProps,
} from './label';

// Alert
export {
  Alert,
  AlertDescription,
  AlertTitle,
  type AlertProps,
} from './alert';
