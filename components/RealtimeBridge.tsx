import { useAdminSocket } from "@/hooks/useAdminSocket";

export function RealtimeBridge() {
  useAdminSocket();
  return null;
}
