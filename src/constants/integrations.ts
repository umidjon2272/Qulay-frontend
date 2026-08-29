import {
  Send,
  CalendarDays,
  HardDrive,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export type IntegrationId =
  | "telegram"
  | "google-calendar"
  | "gmail"
  | "google-drive"
  | "whatsapp"
  | "notion"
  | "slack"
  | "discord"
  | "outlook"
  | "google-contacts";

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  comingSoon?: boolean;
};

export const integrationCatalog: IntegrationDefinition[] = [
  {
    id: "telegram",
    name: "Telegram",
    description: "AI orqali xabarlarni boshqaring",
    icon: Send,
    color: "purple",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Uchrashuv va rejalaringiz",
    icon: CalendarDays,
    color: "blue",
  },
  {
    id: "google-drive",
    name: "Google Drive / Documents",
    description: "Hujjat va fayllaringiz",
    icon: HardDrive,
    color: "green",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "AI orqali xabarlar — tez kunda",
    icon: MessageCircle,
    color: "green",
    comingSoon: true,
  },
];
