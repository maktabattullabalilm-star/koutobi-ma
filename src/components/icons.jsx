import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  Headset,
  Heart,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Minus,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  User,
  Wrench,
  X,
} from 'lucide-react';

// Adapter: keeps the project's (width, height, ...svgProps) calling
// convention while rendering maintained lucide glyphs.
const adapt = (LucideIcon, defaultSize) => ({ width, height, ...p }) => (
  <LucideIcon size={defaultSize} width={width} height={height ?? width} {...p} />
);

export const IconSearch = adapt(Search, 20);
export const IconCart = adapt(ShoppingCart, 22);
export const IconUser = adapt(User, 22);
export const IconMenu = adapt(Menu, 24);
export const IconClose = adapt(X, 22);
export const IconEye = adapt(Eye, 18);
export const IconHeart = adapt(Heart, 18);
export const IconPhone = adapt(Phone, 20);
export const IconPaperPlane = adapt(Send, 18);
export const IconChevronDown = adapt(ChevronDown, 16);
export const IconArrowLeft = adapt(ArrowLeft, 18);

export const IconStar = ({ filled, width, height, ...p }) => (
  <Star
    size={16}
    width={width}
    height={height ?? width}
    fill={filled ? 'currentColor' : 'none'}
    {...p}
  />
);

export const IconCheck = adapt(Check, 20);
export const IconMinus = adapt(Minus, 16);
export const IconPlus = adapt(Plus, 16);
export const IconEdit = adapt(Pencil, 16);
export const IconTrash = adapt(Trash2, 16);
export const IconGrid = adapt(LayoutGrid, 20);
export const IconWrench = adapt(Wrench, 20);
export const IconShield = adapt(ShieldCheck, 26);
export const IconTruck = adapt(Truck, 26);
export const IconBook = adapt(BookOpen, 26);
export const IconHeadset = adapt(Headset, 26);
export const IconCash = adapt(Banknote, 26);
export const IconInbox = adapt(Inbox, 20);
export const IconLogout = adapt(LogOut, 20);

// Brand glyph — lucide has no WhatsApp logo, kept as-is.
export const IconWhatsApp = (p) => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.6-1.5-.9-2.1-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3a3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.5.7 1.7.7 2.3.6.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2 0-.2-.1-.2-.3-.3z" />
  </svg>
);
