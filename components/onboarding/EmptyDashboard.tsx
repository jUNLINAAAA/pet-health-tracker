'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  PawPrint,
  PlusCircle,
  Heart,
  Activity,
  Calendar,
  Bell,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const quickStartSteps = [
  {
    step: 1,
    title: 'Add Your Pet',
    description: 'Start by adding your first pet with basic info like name, species, and breed.',
    icon: PawPrint,
    action: '/dashboard/pets/new',
    actionLabel: 'Add Pet',
  },
  {
    step: 2,
    title: 'Track Health',
    description: 'Log weight, activity, and health records to monitor trends over time.',
    icon: Heart,
  },
  {
    step: 3,
    title: 'Set Reminders',
    description: 'Schedule vet appointments and get reminders for vaccinations.',
    icon: Calendar,
  },
  {
    step: 4,
    title: 'Get Insights',
    description: 'View health scores and ask our AI assistant for personalized advice.',
    icon: Sparkles,
  },
];

export function EmptyDashboard() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 pet-empty-state paw-pattern relative overflow-hidden">
      <div className="pebble-blob pebble-blob-1" />
      <div className="pebble-blob pebble-blob-2" />
      <div className="pebble-blob pebble-blob-3" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Hero Section */}
        <div className="mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--pet-blush)] to-[var(--pet-sky)] flex items-center justify-center shadow-lg shadow-rose-200/60"
          >
            <PawPrint className="w-12 h-12 text-[var(--pet-warm-brown)]" />
          </motion.div>
          <h1 className="text-3xl font-bold pet-heading mb-3">
            Welcome to PetHealth Tracker
          </h1>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            Your dashboard is ready! Add your first pal to start tracking their health and wellness.
          </p>
        </div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Link href="/dashboard/pets/new">
            <Button
              size="lg"
              className="pet-button px-8 py-6 text-lg"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add Your First Pet
            </Button>
          </Link>
        </motion.div>

        {/* Quick Start Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 p-8 shadow-lg shadow-rose-100/40"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-6">
            Quick Start Guide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickStartSteps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`relative p-4 rounded-2xl text-left ${
                  item.step === 1
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200'
                    : 'bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.step === 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          item.step === 1
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        Step {item.step}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {item.description}
                    </p>
                    {item.action && (
                      <Link
                        href={item.action}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {item.actionLabel}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-slate-500"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span>Health Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Smart Alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>AI Assistant</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
