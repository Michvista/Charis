'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Book01Icon,
  TShirtIcon,
  Luggage01Icon,
  UserGroupIcon,
  Analytics01Icon,
  SparklesIcon,
  Settings01Icon,
  PlusSignIcon,
  Cancel01Icon,
  Search01Icon,
  FilterIcon,
  Calendar01Icon,
  Location01Icon,
  FavouriteIcon,
  Comment01Icon,
  Bookmark01Icon,
  SentIcon,
  UserAdd01Icon,
  ViewIcon,
  ViewOffIcon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  TrendingUp,
  BankIcon,
  PieChart01Icon,
  Delete02Icon,
  Upload01Icon,
  PencilEdit01Icon,
  FloppyDiskIcon,
  Share01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  UserIcon,
  Mail01Icon,
  Shield01Icon,
  Logout01Icon,
  Camera01Icon,
  ShoppingBag01Icon,
  PackageIcon,
  Loading01Icon,
  RefreshIcon,
  ThermometerIcon
} from '@hugeicons/core-free-icons';

export const Icons = {
  Home: Home01Icon,
  Library: Book01Icon,
  Shirt: TShirtIcon,
  Luggage: Luggage01Icon,
  Users: UserGroupIcon,
  Analytics: Analytics01Icon,
  Sparkles: SparklesIcon,
  Settings: Settings01Icon,
  Plus: PlusSignIcon,
  X: Cancel01Icon,
  Search: Search01Icon,
  Filter: FilterIcon,
  Calendar: Calendar01Icon,
  MapPin: Location01Icon,
  Heart: FavouriteIcon,
  MessageSquare: Comment01Icon,
  Bookmark: Bookmark01Icon,
  Send: SentIcon,
  UserPlus: UserAdd01Icon,
  Eye: ViewIcon,
  EyeOff: ViewOffIcon,
  AlertCircle: AlertCircleIcon,
  CheckCircle: CheckmarkCircle02Icon,
  Info: InformationCircleIcon,
  TrendingUp: TrendingUp,
  Landmark: BankIcon,
  PieChart: PieChart01Icon,
  Trash: Delete02Icon,
  Upload: Upload01Icon,
  Edit: PencilEdit01Icon,
  Save: FloppyDiskIcon,
  Share: Share01Icon,
  ChevronDown: ArrowDown01Icon,
  ArrowRight: ArrowRight01Icon,
  User: UserIcon,
  Mail: Mail01Icon,
  Shield: Shield01Icon,
  LogOut: Logout01Icon,
  Camera: Camera01Icon,
  ShoppingBag: ShoppingBag01Icon,
  Check: CheckmarkCircle02Icon,
  Package: PackageIcon,
  Loader: Loading01Icon,
  Refresh: RefreshIcon,
  Thermometer: ThermometerIcon
};

type HugeIconProps = {
  icon: any;
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ icon, size = 20, className = '', color }: HugeIconProps) {
  if (!icon) return null;
  return <HugeiconsIcon icon={icon} size={size} className={className} color={color} />;
}
