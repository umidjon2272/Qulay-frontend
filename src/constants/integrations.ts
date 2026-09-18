import {
  Send,
  CalendarDays,
  HardDrive,
  MessageCircle,
  Camera,
  Database,
  type LucideIcon,
} from "lucide-react";

export type IntegrationId =
  | "telegram"
  | "google-calendar"
  | "gmail"
  | "google-drive"
  | "whatsapp"
  | "instagram"
  | "bito"
  | "notion"
  | "slack"
  | "discord"
  | "outlook"
  | "google-contacts";

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  descriptionKey: string;
  description: string;
  icon: LucideIcon;
  color: string;
  comingSoon?: boolean;
};

export const integrationCatalog: IntegrationDefinition[] = [
  {
    id: "telegram",
    name: "Telegram",
    descriptionKey: "integrations.telegram.description",
    description: "AI orqali xabarlarni boshqaring",
    icon: Send,
    color: "purple",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    descriptionKey: "integrations.googleCalendar.description",
    description: "Uchrashuv va rejalaringiz",
    icon: CalendarDays,
    color: "blue",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    descriptionKey: "integrations.googleDrive.description",
    description: "Hujjat va fayllaringiz",
    icon: HardDrive,
    color: "green",
  },
  {
    id: "bito",
    name: "Bito ERP",
    descriptionKey: "integrations.bito.description",
    description: "Ombor, savdo, moliya, mijozlar, xodimlar va boshqa ERP ma’lumotlari",
    icon: Database,
    color: "purple",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    descriptionKey: "integrations.whatsapp.description",
    description: "WhatsApp AI sotuv agenti — tez kunda",
    icon: MessageCircle,
    color: "green",
    comingSoon: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    descriptionKey: "integrations.instagram.description",
    description: "Instagram AI sotuv agenti — tez kunda",
    icon: Camera,
    color: "purple",
    comingSoon: true,
  },
];
