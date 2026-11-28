export const whatsappSupport = {
  phone: "923486587556",
  displayPhone: "+92 348 6587556",
  message: "Hi, I have a query.",
} as const;

export const whatsappSupportUrl = `https://wa.me/${whatsappSupport.phone}?text=${encodeURIComponent(
  whatsappSupport.message
)}`;

export interface WhatsAppResourceItem {
  id: string;
  kind: "channel" | "group";
  classification: string;
  title: string;
  description: string;
  metaLabel: string;
  metaIcon: "radio" | "messagesSquare";
  ctaLabel: string;
  href: string;
  variant: "filled" | "outlined";
}

export const WHATSAPP_CHANNELS: WhatsAppResourceItem[] = [
  {
    id: "study-in-germany-updates",
    kind: "channel",
    classification: "Broadcast channel",
    title: "Study In Germany — Updates",
    description: "Follow visa announcements, embassy updates, and important application milestones.",
    metaLabel: "One-way updates",
    metaIcon: "radio",
    ctaLabel: "Follow channel",
    href: "https://whatsapp.com/channel/0029VbD6YAn4yltJDqNw773k",
    variant: "filled",
  },
  {
    id: "learn-german",
    kind: "channel",
    classification: "Broadcast channel",
    title: "Learn German",
    description: "Daily German vocabulary, grammar tips, and study resources for applicants.",
    metaLabel: "One-way updates",
    metaIcon: "radio",
    ctaLabel: "Follow channel",
    href: "https://whatsapp.com/channel/0029Vb9BeHeFsn0ielFdth2M",
    variant: "filled",
  },
];

export const WHATSAPP_COMMUNITIES: WhatsAppResourceItem[] = [
  {
    id: "study-in-germany-community-1",
    kind: "group",
    classification: "Discussion group",
    title: "Study In Germany Community 1",
    description: "Ask questions, share experiences, and connect with fellow applicants.",
    metaLabel: "Community discussion",
    metaIcon: "messagesSquare",
    ctaLabel: "Join group",
    href: "https://chat.whatsapp.com/BZ6f2Yodozr3oNWTtqsR40",
    variant: "outlined",
  },
  {
    id: "study-in-germany-community-2",
    kind: "group",
    classification: "Discussion group",
    title: "Study In Germany Community 2",
    description: "Additional peer group for admissions, APS, and German visa discussions.",
    metaLabel: "Community discussion",
    metaIcon: "messagesSquare",
    ctaLabel: "Join group",
    href: "https://chat.whatsapp.com/CqZMXiA1EpaBS0NLw2vFJO",
    variant: "outlined",
  },
  {
    id: "deutsch-mit-idrees-community",
    kind: "group",
    classification: "Discussion group",
    title: "Deutsch Mit Idrees Community",
    description: "Practice German, ask language questions, and prepare with other learners.",
    metaLabel: "Community discussion",
    metaIcon: "messagesSquare",
    ctaLabel: "Join group",
    href: "https://chat.whatsapp.com/DcF8N7CNLlgJ5g2Dmsq5qH",
    variant: "outlined",
  },
];
