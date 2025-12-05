'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PawPrint,
  Heart,
  Activity,
  Calendar,
  Bell,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  userName?: string;
  onComplete: () => void;
}

const features = [
  {
    icon: PawPrint,
    title: 'Track Multiple Pets',
    description: 'Add all your furry friends and keep their health records organized in one place.',
  },
  {
    icon: Heart,
    title: 'Health Monitoring',
    description: 'Track weight, activity, vaccinations, and get a comprehensive health score.',
  },
  {
    icon: Calendar,
    title: 'Appointment Reminders',
    description: 'Never miss a vet visit with smart appointment scheduling and reminders.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Get notified about important health concerns and upcoming care needs.',
  },
  {
    icon: Sparkles,
    title: 'AI Health Assistant',
    description: 'Ask our AI assistant for personalized pet health advice anytime.',
  },
];

export function WelcomeScreen({ userName, onComplete }: WelcomeScreenProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleGetStarted = () => {
    if (step < features.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
      router.push('/dashboard/pets/new?onboarding=true');
    }
  };

  const handleSkip = () => {
    onComplete();
    router.push('/dashboard/pets/new?onboarding=true');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        {/* Welcome Header */}
        {step === 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <PawPrint className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              Welcome{userName ? `, ${userName}` : ''}!
            </h1>
            <p className="text-slate-500 text-lg">
              Let&apos;s get you started with PetHealth Tracker
            </p>
          </motion.div>
        )}

        {/* Feature Carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 p-8 mb-8"
          >
            {step === 0 ? (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-800">
                  Your pet&apos;s health companion
                </h2>
                <p className="text-slate-600">
                  Track health metrics, manage appointments, receive alerts, and get AI-powered advice for all your pets.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {features.slice(0, 4).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-left p-3 rounded-xl bg-slate-50"
                    >
                      <feature.icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{feature.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  {(() => {
                    const Icon = features[step - 1]?.icon || Activity;
                    return <Icon className="w-8 h-8 text-blue-600" />;
                  })()}
                </div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {features[step - 1]?.title}
                </h2>
                <p className="text-slate-600">
                  {features[step - 1]?.description}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, ...features.map((_, i) => i + 1)].slice(0, 6).map((_, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === step
                  ? 'w-8 bg-blue-600'
                  : index < step
                    ? 'bg-blue-400'
                    : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-700"
          >
            Skip tutorial
          </Button>
          <Button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 shadow-lg shadow-blue-500/25"
          >
            {step < features.length ? (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Add Your First Pet
                <PawPrint className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
