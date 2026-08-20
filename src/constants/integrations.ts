import {
  Send,
  CalendarDays,
  Mail,
  HardDrive,
  MessageCircle,
  FileText,
  Hash,
  MessageSquare,
  Inbox,
  Users,
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
    id: "gmail",
    name: "Gmail",
    description: "Email yozish va boshqarish",
    icon: Mail,
    color: "red",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Hujjat va fayllaringiz",
    icon: HardDrive,
    color: "green",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Kontaktlar bilan aloqa",
    icon: MessageCircle,
    color: "cyan",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Hujjat va bazalaringizni ulang",
    icon: FileText,
    color: "slate",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Jamoa suhbatlarini boshqaring",
    icon: Hash,
    color: "purple",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Community va serverlaringiz",
    icon: MessageSquare,
    color: "blue",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Email va kalendaringizni ulang",
    icon: Inbox,
    color: "blue",
  },
  {
    id: "google-contacts",
    name: "Google Contacts",
    description: "Kontaktlaringizdan foydalaning",
    icon: Users,
    color: "green",
  },
];
