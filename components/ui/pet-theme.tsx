'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Heart,
  AlertTriangle,
  Calendar,
  Stethoscope,
  Activity,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// PLAYFUL PET THEME COMPONENTS - Maltese Inspired
// ═══════════════════════════════════════════════════════════════════════════

interface PetAvatarProps {
  species?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPulse?: boolean;
}

export function PetAvatar({ species = 'dog', name, size = 'md', className, showPulse }: PetAvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
  };

  const getSpeciesEmoji = () => {
    const s = species?.toLowerCase();
    if (s?.includes('cat')) return '🐱';
    if (s?.includes('bird') || s?.includes('parrot')) return '🦜';
    if (s?.includes('rabbit') || s?.includes('bunny')) return '🐰';
    if (s?.includes('fish')) return '🐠';
    if (s?.includes('hamster')) return '🐹';
    if (s?.includes('guinea')) return '🐹';
    if (s?.includes('reptile') || s?.includes('snake')) return '🦎';
    if (s?.includes('turtle')) return '🐢';
    return '🐕';
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      {showPulse && (
        <span className="absolute inset-0 animate-ping rounded-full bg-pet-accent/30" />
      )}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full',
          'bg-gradient-to-br from-pet-cream to-pet-blush',
          'border-2 border-pet-brown/20',
          'shadow-pet',
          sizeClasses[size]
        )}
      >
        <span>{getSpeciesEmoji()}</span>
      </div>
      {name && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-pet-brown shadow-sm">
          {name}
        </span>
      )}
    </div>
  );
}

interface PetStatusChipProps {
  status: 'happy' | 'good' | 'caution' | 'alert' | 'calm';
  label?: string;
  className?: string;
}

export function PetStatusChip({ status, label, className }: PetStatusChipProps) {
  const statusConfig = {
    happy: { bg: 'bg-pet-meadow', text: 'text-green-800', emoji: '😊', defaultLabel: 'Happy pup!' },
    good: { bg: 'bg-pet-meadow', text: 'text-green-800', emoji: '✨', defaultLabel: 'Feeling great' },
    caution: { bg: 'bg-pet-honey', text: 'text-amber-800', emoji: '👀', defaultLabel: 'Keep an eye' },
    alert: { bg: 'bg-pet-blush', text: 'text-rose-800', emoji: '🩺', defaultLabel: 'Vet check soon' },
    calm: { bg: 'bg-pet-sky', text: 'text-blue-800', emoji: '😌', defaultLabel: 'All calm' },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span>{config.emoji}</span>
      {label || config.defaultLabel}
    </span>
  );
}

interface PetEmptyStateProps {
  type: 'pets' | 'alerts' | 'appointments' | 'records' | 'general';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PetEmptyState({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: PetEmptyStateProps) {
  const configs = {
    pets: {
      emoji: '🐾',
      defaultTitle: 'No furry friends yet!',
      defaultDescription: 'Add your first pet to start tracking their health journey.',
      defaultAction: 'Add Your First Pet',
    },
    alerts: {
      emoji: '✨',
      defaultTitle: 'All clear!',
      defaultDescription: 'No health alerts right now. Your pets are doing great!',
      defaultAction: undefined,
    },
    appointments: {
      emoji: '📅',
      defaultTitle: 'No appointments scheduled',
      defaultDescription: 'Schedule a vet visit to keep your pet healthy and happy.',
      defaultAction: 'Schedule Visit',
    },
    records: {
      emoji: '📋',
      defaultTitle: 'No health records yet',
      defaultDescription: 'Start tracking weight, activity, and more for better insights.',
      defaultAction: 'Add First Record',
    },
    general: {
      emoji: '🐕',
      defaultTitle: 'Nothing here yet',
      defaultDescription: 'Get started by adding some data.',
      defaultAction: 'Get Started',
    },
  };

  const config = configs[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('pet-empty-state', className)}
    >
      <div className="pet-empty-state-icon">
        <span className="animate-paw-bounce">{config.emoji}</span>
      </div>
      <h3 className="mb-2 font-display text-xl font-semibold text-pet-brown">
        {title || config.defaultTitle}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-gray-600">
        {description || config.defaultDescription}
      </p>
      {(actionLabel || config.defaultAction) && onAction && (
        <button onClick={onAction} className="pet-button">
          {actionLabel || config.defaultAction}
        </button>
      )}
    </motion.div>
  );
}

interface PetAlertCardProps {
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  petName?: string;
  recommendation?: string;
  onResolve?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function PetAlertCard({
  severity,
  title,
  message,
  petName,
  recommendation,
  onResolve,
  onAction,
  actionLabel,
  className,
}: PetAlertCardProps) {
  const severityConfig = {
    low: {
      bg: 'from-pet-sky/30 to-white',
      border: 'border-pet-calm/30',
      icon: '💙',
      label: 'FYI',
    },
    medium: {
      bg: 'from-pet-honey/30 to-white',
      border: 'border-pet-caution/30',
      icon: '💛',
      label: 'Heads up',
    },
    high: {
      bg: 'from-pet-blush/40 to-white',
      border: 'border-pet-alert/30',
      icon: '❤️',
      label: 'Important',
    },
  };

  const config = severityConfig[severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4',
        `bg-gradient-to-br ${config.bg}`,
        config.border,
        className
      )}
    >
      <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 rotate-[-15deg]">
        🐾
      </div>

      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-600">
              {config.label}
            </span>
            {petName && (
              <span className="text-xs font-medium text-pet-brown">{petName}</span>
            )}
          </div>
          {onResolve && (
            <button
              onClick={onResolve}
              className="rounded-full p-1 text-xs text-gray-500 hover:bg-white/50"
            >
              Mark resolved
            </button>
          )}
        </div>

        <h4 className="mb-1 font-display font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{message}</p>

        {recommendation && (
          <div className="mt-3 rounded-xl bg-white/50 p-3">
            <p className="text-xs font-medium text-pet-brown">
              💡 {recommendation}
            </p>
          </div>
        )}

        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="mt-3 w-full rounded-xl bg-white/70 px-4 py-2 text-sm font-medium text-pet-brown shadow-sm transition-all hover:bg-white hover:shadow-md"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface PetMoodIndicatorProps {
  score: number;
  petName?: string;
  className?: string;
}

export function PetMoodIndicator({ score, petName, className }: PetMoodIndicatorProps) {
  const getMoodData = () => {
    if (score >= 90) return { emoji: '🌟', text: 'Thriving!', color: 'text-green-600' };
    if (score >= 80) return { emoji: '😊', text: 'Happy & healthy', color: 'text-green-600' };
    if (score >= 70) return { emoji: '🙂', text: 'Doing well', color: 'text-blue-600' };
    if (score >= 60) return { emoji: '😐', text: 'Could be better', color: 'text-amber-600' };
    if (score >= 50) return { emoji: '😟', text: 'Needs attention', color: 'text-orange-600' };
    return { emoji: '🏥', text: 'Vet visit recommended', color: 'text-red-600' };
  };

  const mood = getMoodData();

  return (
    <div className={cn('pet-mood', className)}>
      <span className="text-xl">{mood.emoji}</span>
      <div>
        {petName && <span className="text-xs text-gray-500">{petName} is </span>}
        <span className={cn('font-medium', mood.color)}>{mood.text}</span>
      </div>
    </div>
  );
}

interface PetBackgroundProps {
  variant?: 'paws' | 'clouds' | 'blobs' | 'gradient';
  className?: string;
  children: React.ReactNode;
}

export function PetBackground({ variant = 'gradient', className, children }: PetBackgroundProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {variant === 'paws' && <div className="absolute inset-0 paw-pattern" />}
      {variant === 'clouds' && <div className="absolute inset-0 cloud-pattern" />}
      {variant === 'blobs' && (
        <>
          <div className="pebble-blob pebble-blob-1" />
          <div className="pebble-blob pebble-blob-2" />
          <div className="pebble-blob pebble-blob-3" />
        </>
      )}
      {variant === 'gradient' && (
        <div className="absolute inset-0 bg-gradient-to-br from-pet-cream via-white to-pet-sky/30" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

interface PetCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function PetCard({ children, className, hover = true }: PetCardProps) {
  return (
    <div
      className={cn(
        'pet-card p-5',
        hover && 'hover:shadow-pet-hover',
        className
      )}
    >
      {children}
    </div>
  );
}

interface PetButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function PetButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
}: PetButtonProps) {
  const variants = {
    primary: 'pet-button',
    secondary: 'bg-white border border-pet-brown/20 text-pet-brown hover:bg-pet-cream',
    ghost: 'bg-transparent text-pet-brown hover:bg-pet-cream/50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-[15px]',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-semibold rounded-[20px] transition-all',
        variant === 'primary' ? variants.primary : cn(variants[variant], sizes[size]),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

interface PetSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PetSectionHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: PetSectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pet-cream text-pet-brown">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
