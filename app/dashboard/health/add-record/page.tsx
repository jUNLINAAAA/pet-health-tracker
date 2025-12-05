"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Surface } from '@/components/ui/Surface';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  ArrowLeft,
  Upload,
  Activity,
  Scale,
  Syringe,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Stethoscope,
  Heart,
  Thermometer,
  Wind,
  UtensilsCrossed,
  Sparkles,
  Camera,
  File,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PetService, HealthRecordService } from '@/lib/services';
import { useHealth } from '@/lib/health-context';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';

interface OcrResult {
  success: boolean;
  documentId?: string;
  extractedData?: {
    documentType: string;
    documentDate: string;
    clinicName: string;
    veterinarian: string;
    confidence: number;
    recordsFound: {
      vaccinations: number;
      healthRecords: number;
      labResults: number;
      medications: number;
      diagnoses: number;
    };
    recommendations: string[];
    alerts: any[];
  };
  healthRecordsCreated?: number;
  records?: any[];
  error?: string;
}

const recordTypeConfig = {
  standard: {
    icon: Heart,
    label: 'Health Metrics',
    description: 'Weight, temperature, vitals, appetite',
    gradient: 'from-rose-500 to-pink-500',
    bgLight: 'bg-rose-50',
    borderActive: 'border-rose-300',
  },
  vaccination: {
    icon: Syringe,
    label: 'Vaccination',
    description: 'Shots & immunizations',
    gradient: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50',
    borderActive: 'border-emerald-300',
  },
  activity: {
    icon: Activity,
    label: 'Activity',
    description: 'Walks, play, exercise',
    gradient: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    borderActive: 'border-amber-300',
  },
  clinical: {
    icon: Stethoscope,
    label: 'Vet Visit',
    description: 'Clinical summaries',
    gradient: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50',
    borderActive: 'border-blue-300',
  },
};

const metricTypeConfig: Record<string, { icon: React.ElementType; label: string; placeholder: string; unit: string }> = {
  weight: { icon: Scale, label: 'Weight', placeholder: 'e.g., 5.2', unit: 'kg' },
  temperature: { icon: Thermometer, label: 'Temperature', placeholder: 'e.g., 38.5', unit: '°C' },
  heart_rate: { icon: Heart, label: 'Heart Rate', placeholder: 'e.g., 120', unit: 'bpm' },
  respiratory_rate: { icon: Wind, label: 'Respiratory', placeholder: 'e.g., 25', unit: 'brpm' },
  appetite: { icon: UtensilsCrossed, label: 'Appetite', placeholder: '1=Poor, 3=Normal, 5=Excellent', unit: '/5' },
};

export default function AddHealthRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { reload } = useHealth();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recordType, setRecordType] = useState<'standard' | 'vaccination' | 'activity' | 'clinical'>('standard');
  const [showOcrUpload, setShowOcrUpload] = useState(false);

  // OCR upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    petId: '',
    type: 'weight',
    value: '',
    unit: 'kg',
    notes: '',
    recordedAt: format(new Date(), 'yyyy-MM-dd'),
    vaccinationName: '',
    vaccinationDate: format(new Date(), 'yyyy-MM-dd'),
    nextDueDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    activityType: 'walk',
    activityDuration: '30',
    activityDistance: '',
    clinicName: '',
    veterinarianName: '',
    visitReason: '',
    diagnosis: '',
    treatmentPlan: '',
    followUpDate: '',
  });

  // Set default units based on record type
  useEffect(() => {
    const unitMap: Record<string, string> = {
      weight: 'kg',
      temperature: '°C',
      heart_rate: 'bpm',
      appetite: '/5',
      respiratory_rate: 'brpm',
    };
    if (unitMap[formData.type]) {
      setFormData(prev => ({ ...prev, unit: unitMap[formData.type] }));
    }
  }, [formData.type]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const petIdFromUrl = searchParams?.get('petId');
        const petsData = await PetService.getPets();
        setPets(petsData);

        if (petIdFromUrl && petsData.some(pet => pet.id === petIdFromUrl)) {
          setFormData(prev => ({ ...prev, petId: petIdFromUrl }));
        } else if (petsData.length > 0) {
          setFormData(prev => ({ ...prev, petId: petsData[0].id }));
        }

        const typeFromUrl = searchParams?.get('type');
        if (typeFromUrl && ['weight', 'temperature', 'heart_rate', 'vaccination', 'activity', 'appetite', 'respiratory_rate'].includes(typeFromUrl)) {
          setRecordType(typeFromUrl === 'vaccination' ? 'vaccination' : typeFromUrl === 'activity' ? 'activity' : 'standard');
          setFormData(prev => ({ ...prev, type: typeFromUrl }));
        }
      } catch (error) {
        console.error("Error loading pets:", error);
        toast.error("Could not load pets. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.petId) {
      toast.error('Please select a pet');
      return;
    }

    if (recordType === 'standard' && !formData.value) {
      toast.error('Please enter a value');
      return;
    }

    if (recordType === 'vaccination' && !formData.vaccinationName) {
      toast.error('Please enter vaccination name');
      return;
    }

    if (recordType === 'activity' && !formData.activityDuration) {
      toast.error('Please enter activity duration');
      return;
    }

    if (recordType === 'clinical' && !formData.visitReason) {
      toast.error('Please enter the reason for visit');
      return;
    }

    setSubmitting(true);

    try {
      let recordData: any;

      if (recordType === 'standard') {
        recordData = {
          petId: formData.petId,
          type: formData.type,
          value: Number(formData.value),
          unit: formData.unit,
          notes: formData.notes || undefined,
          recordedAt: formData.recordedAt ? new Date(formData.recordedAt).toISOString() : undefined,
        };

        if (formData.type === 'weight') {
          try {
            await PetService.updatePet(formData.petId, { weight: Number(formData.value) });
          } catch (err) {
            console.warn('Could not update pet weight:', err);
          }
        }
      } else if (recordType === 'vaccination') {
        recordData = {
          petId: formData.petId,
          type: 'vaccination',
          value: 1,
          unit: 'dose',
          notes: `${formData.vaccinationName}. Next due: ${formData.nextDueDate}`,
          recordedAt: formData.vaccinationDate ? new Date(formData.vaccinationDate).toISOString() : undefined,
        };
      } else if (recordType === 'activity') {
        recordData = {
          petId: formData.petId,
          type: 'activity',
          value: Number(formData.activityDuration),
          unit: 'minutes',
          notes: `${formData.activityType}${formData.activityDistance ? `. Distance: ${formData.activityDistance} km` : ''}${formData.notes ? `. ${formData.notes}` : ''}`,
          recordedAt: new Date().toISOString(),
        };

        try {
          const selectedPet = pets.find(p => p.id === formData.petId);
          const newActivityMinutes = (selectedPet?.activityMinutes || 0) + Number(formData.activityDuration);
          await PetService.updatePet(formData.petId, { activityMinutes: newActivityMinutes });
        } catch (err) {
          console.warn('Could not update pet activity:', err);
        }
      } else if (recordType === 'clinical') {
        const clinicalNotes = [
          formData.clinicName && `Clinic: ${formData.clinicName}`,
          formData.veterinarianName && `Veterinarian: ${formData.veterinarianName}`,
          `Reason for Visit: ${formData.visitReason}`,
          formData.diagnosis && `Diagnosis: ${formData.diagnosis}`,
          formData.treatmentPlan && `Treatment Plan: ${formData.treatmentPlan}`,
          formData.followUpDate && `Follow-up: ${formData.followUpDate}`,
          formData.notes && `Additional Notes: ${formData.notes}`,
        ].filter(Boolean).join('\n');

        recordData = {
          petId: formData.petId,
          type: 'clinical_summary',
          value: 1,
          unit: 'visit',
          notes: clinicalNotes,
          recordedAt: formData.recordedAt ? new Date(formData.recordedAt).toISOString() : new Date().toISOString(),
        };
      }

      const result = await HealthRecordService.createHealthRecord(recordData);

      if (result) {
        toast.success('Health record added successfully!');
        // Keep client state in sync before navigation
        try {
          await reload();
        } catch (err) {
          console.warn('Health context reload failed after record add:', err);
        }
        router.push(`/dashboard/health`);
      }
    } catch (error) {
      console.error('Error adding health record:', error);
      toast.error('Failed to add health record. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // OCR file upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    if (!formData.petId) {
      toast.error('Please select a pet first');
      return;
    }

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 52428800) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setUploadingFile(true);
    setUploadProgress('uploading');
    setOcrResult(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please log in to upload documents');
        setUploadProgress('error');
        return;
      }

      setUploadProgress('processing');
      toast.info('Processing document with AI OCR...', { duration: 5000 });

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('userId', user.id);
      uploadFormData.append('petId', formData.petId);

      const response = await fetch('/api/documents/ocr', {
        method: 'POST',
        body: uploadFormData,
      });

      const result: OcrResult = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'OCR processing failed');
      }

      setOcrResult(result);
      setUploadProgress('complete');

      const recordCount = result.healthRecordsCreated || 0;
      toast.success(
        `Document processed! Created ${recordCount} health record${recordCount !== 1 ? 's' : ''}.`,
        { duration: 5000 }
      );
      try {
        await reload();
      } catch (err) {
        console.warn('Health context reload failed after OCR:', err);
      }

      const recordsFound = result.extractedData?.recordsFound;
      if (recordsFound) {
        const found: string[] = [];
        if (recordsFound.vaccinations) found.push(`${recordsFound.vaccinations} vaccination(s)`);
        if (recordsFound.healthRecords) found.push(`${recordsFound.healthRecords} health record(s)`);
        if (recordsFound.labResults) found.push(`${recordsFound.labResults} lab result(s)`);
        if (recordsFound.medications) found.push(`${recordsFound.medications} medication(s)`);
        if (recordsFound.diagnoses) found.push(`${recordsFound.diagnoses} diagnosis(es)`);

        if (found.length > 0) {
          toast.info(`Found: ${found.join(', ')}`, { duration: 4000 });
        }
      }

    } catch (error: any) {
      console.error('OCR upload error:', error);
      setUploadProgress('error');
      setOcrResult({ success: false, error: error.message });
      toast.error(error.message || 'Failed to process document');
    } finally {
      setUploadingFile(false);
    }
  }, [formData.petId, reload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const clearUpload = () => {
    setSelectedFile(null);
    setUploadProgress('idle');
    setOcrResult(null);
  };

  const selectedPet = pets.find(p => p.id === formData.petId);
  const currentConfig = recordTypeConfig[recordType];
  const CurrentIcon = currentConfig.icon;

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-slate-500">
        <div className="flex gap-2">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-300"
              style={{ animationDelay: `${dot * 120}ms` }}
            />
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-6 pt-0 sm:space-y-6 sm:pb-8">
      {/* Header */}
      <Surface variant="glass" className="rounded-[32px] border-white/60 bg-white/85 p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/health"
            className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold">Health records</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Add New Record</h1>
          </div>
        </div>
      </Surface>

      {/* Pet Selector */}
      <Surface variant="glass" className="rounded-[28px] border-white/50 bg-white/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-3">Select pet</p>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {pets.map(pet => (
            <motion.button
              key={pet.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, petId: pet.id }))}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all",
                formData.petId === pet.id
                  ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
                  : "border-white/60 bg-white/60 hover:bg-white hover:border-slate-200"
              )}
            >
              <span className="text-2xl">
                {pet.species?.toLowerCase().includes('cat') ? '🐱' :
                 pet.species?.toLowerCase().includes('bird') ? '🦜' :
                 pet.species?.toLowerCase().includes('rabbit') ? '🐰' :
                 pet.species?.toLowerCase().includes('fish') ? '🐠' :
                 pet.species?.toLowerCase().includes('hamster') ? '🐹' : '🐕'}
              </span>
              <div className="text-left">
                <p className={cn(
                  "font-semibold",
                  formData.petId === pet.id ? "text-blue-700" : "text-slate-700"
                )}>
                  {pet.name}
                </p>
                <p className="text-xs text-slate-500">{pet.breed || pet.species}</p>
              </div>
              {formData.petId === pet.id && (
                <CheckCircle className="h-5 w-5 text-blue-500 ml-2" />
              )}
            </motion.button>
          ))}
        </div>
      </Surface>

      {/* Record Type Selector */}
      <Surface variant="glass" className="rounded-[28px] border-white/50 bg-white/80 p-5">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-3">Record type</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(recordTypeConfig) as [keyof typeof recordTypeConfig, typeof recordTypeConfig.standard][]).map(([key, config]) => {
            const Icon = config.icon;
            const isSelected = recordType === key;
            return (
              <motion.button
                key={key}
                type="button"
                onClick={() => setRecordType(key)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative rounded-2xl p-4 text-left transition-all border-2",
                  isSelected
                    ? `${config.bgLight} ${config.borderActive} shadow-lg`
                    : "bg-white/60 border-white/60 hover:bg-white hover:border-slate-200"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                  isSelected ? `bg-gradient-to-br ${config.gradient}` : "bg-slate-100"
                )}>
                  <Icon className={cn("h-5 w-5", isSelected ? "text-white" : "text-slate-500")} />
                </div>
                <p className={cn("font-semibold text-sm", isSelected ? "text-slate-900" : "text-slate-700")}>
                  {config.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{config.description}</p>
                {isSelected && (
                  <div className={cn(
                    "absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center",
                    `bg-gradient-to-br ${config.gradient}`
                  )}>
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </Surface>

      {/* AI OCR Upload Toggle */}
      <Surface
        variant="gradient"
        className={cn(
          "rounded-[28px] border-white/50 p-5 cursor-pointer transition-all",
          showOcrUpload && "ring-2 ring-purple-300"
        )}
        onClick={() => setShowOcrUpload(!showOcrUpload)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">AI Document Scanner</p>
              <p className="text-sm text-slate-500">Upload vet reports, lab results, vaccination records</p>
            </div>
          </div>
          <div className={cn(
            "w-14 h-7 rounded-full transition-colors flex items-center px-1",
            showOcrUpload ? "bg-purple-500" : "bg-slate-200"
          )}>
            <motion.div
              className="w-5 h-5 rounded-full bg-white shadow-md"
              animate={{ x: showOcrUpload ? 26 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </div>
      </Surface>

      {/* OCR Upload Section */}
      <AnimatePresence>
        {showOcrUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Surface variant="glass" className="rounded-[28px] border-white/50 bg-white/80 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Upload Health Document</h3>
                  <p className="text-sm text-slate-500">AI extracts vaccinations, weight, lab results, medications</p>
                </div>
              </div>

              {/* Upload Zone */}
              {uploadProgress === 'idle' && (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                    dragActive
                      ? "border-purple-400 bg-purple-50"
                      : "border-slate-200 hover:border-purple-300 bg-slate-50/50"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Drag and drop your document here
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileInputChange}
                    />
                    <label htmlFor="file-upload">
                      <span className="inline-flex items-center gap-2 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md">
                        <File className="h-4 w-4" />
                        Browse Files
                      </span>
                    </label>
                    <label htmlFor="file-upload">
                      <span className="inline-flex items-center gap-2 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md">
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-4">
                    PDF, PNG, JPG, WEBP (max 50MB)
                  </p>
                </div>
              )}

              {/* Processing State */}
              {(uploadProgress === 'uploading' || uploadProgress === 'processing') && (
                <div className="border-2 border-purple-200 bg-purple-50 rounded-2xl p-8 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <Loader2 className="h-16 w-16 text-purple-500 animate-spin" />
                    <Sparkles className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm text-purple-700 font-medium">
                    {uploadProgress === 'uploading' ? 'Uploading document...' : 'AI is analyzing your document...'}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-purple-600 mt-2">{selectedFile.name}</p>
                  )}
                </div>
              )}

              {/* Success State */}
              {uploadProgress === 'complete' && ocrResult?.success && (
                <div className="border-2 border-emerald-200 bg-emerald-50 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-700">Success!</p>
                        <p className="text-sm text-emerald-600">
                          Created {ocrResult.healthRecordsCreated || 0} health record(s)
                        </p>
                      </div>
                    </div>
                    <button onClick={clearUpload} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {ocrResult.extractedData && (
                    <div className="space-y-3 text-sm">
                      {ocrResult.extractedData.documentType && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <FileText className="h-4 w-4" />
                          <span>{ocrResult.extractedData.documentType.replace('_', ' ')}</span>
                        </div>
                      )}
                      {ocrResult.extractedData.clinicName && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Stethoscope className="h-4 w-4" />
                          <span>{ocrResult.extractedData.clinicName}</span>
                        </div>
                      )}

                      {ocrResult.extractedData.recordsFound && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {Object.entries(ocrResult.extractedData.recordsFound).map(([key, value]) =>
                            value > 0 ? (
                              <span
                                key={key}
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"
                              >
                                {value} {key.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={clearUpload}
                    className="mt-4 rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Upload Another
                  </button>
                </div>
              )}

              {/* Error State */}
              {uploadProgress === 'error' && (
                <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-700">Processing failed</p>
                        <p className="text-sm text-red-600">
                          {ocrResult?.error || 'Unable to process document'}
                        </p>
                      </div>
                    </div>
                    <button onClick={clearUpload} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={clearUpload}
                    className="mt-4 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </Surface>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Entry Form */}
      <Surface variant="glass" className="rounded-[28px] border-white/50 bg-white/80 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            `bg-gradient-to-br ${currentConfig.gradient}`
          )}>
            <CurrentIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{currentConfig.label}</p>
            <p className="text-xs text-slate-500">Manual entry</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Standard Health Metrics */}
          {recordType === 'standard' && (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-3">Metric type</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(metricTypeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = formData.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: key }))}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left",
                          isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isSelected ? "text-blue-600" : "text-slate-400")} />
                        <span className={cn("text-sm font-medium", isSelected ? "text-blue-700" : "text-slate-600")}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="value" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Value</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={handleChange}
                    placeholder={metricTypeConfig[formData.type]?.placeholder || 'Enter value'}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Unit</Label>
                  <Input
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="recordedAt" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Date</Label>
                <Input
                  id="recordedAt"
                  name="recordedAt"
                  type="date"
                  value={formData.recordedAt}
                  onChange={handleChange}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any additional observations..."
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white resize-none"
                />
              </div>
            </>
          )}

          {/* Vaccination Form */}
          {recordType === 'vaccination' && (
            <>
              <div>
                <Label htmlFor="vaccinationName" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Vaccination name</Label>
                <Input
                  id="vaccinationName"
                  name="vaccinationName"
                  value={formData.vaccinationName}
                  onChange={handleChange}
                  placeholder="e.g., Rabies, DHPP, Bordetella"
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="vaccinationDate" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Date given</Label>
                  <Input
                    id="vaccinationDate"
                    name="vaccinationDate"
                    type="date"
                    value={formData.vaccinationDate}
                    onChange={handleChange}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nextDueDate" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Next due</Label>
                  <Input
                    id="nextDueDate"
                    name="nextDueDate"
                    type="date"
                    value={formData.nextDueDate}
                    onChange={handleChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Batch number, veterinarian, or other details"
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white resize-none"
                />
              </div>
            </>
          )}

          {/* Activity Form */}
          {recordType === 'activity' && (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-3">Activity type</p>
                <div className="grid grid-cols-3 gap-2">
                  {['walk', 'run', 'play', 'swim', 'training', 'other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, activityType: type }))}
                      className={cn(
                        "p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all",
                        formData.activityType === type
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="activityDuration" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Duration (min)</Label>
                  <Input
                    id="activityDuration"
                    name="activityDuration"
                    type="number"
                    min="1"
                    value={formData.activityDuration}
                    onChange={handleChange}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="activityDistance" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Distance (km)</Label>
                  <Input
                    id="activityDistance"
                    name="activityDistance"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.activityDistance}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Energy level, weather, notable behaviors..."
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white resize-none"
                />
              </div>
            </>
          )}

          {/* Clinical Visit Form */}
          {recordType === 'clinical' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="clinicName" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Clinic</Label>
                  <Input
                    id="clinicName"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleChange}
                    placeholder="Happy Paws Clinic"
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="veterinarianName" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Veterinarian</Label>
                  <Input
                    id="veterinarianName"
                    name="veterinarianName"
                    value={formData.veterinarianName}
                    onChange={handleChange}
                    placeholder="Dr. Smith"
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="visitReason" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Reason for visit *</Label>
                <Input
                  id="visitReason"
                  name="visitReason"
                  value={formData.visitReason}
                  onChange={handleChange}
                  placeholder="Annual checkup, skin issue, limping..."
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="diagnosis" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Veterinarian's findings..."
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white resize-none"
                />
              </div>

              <div>
                <Label htmlFor="treatmentPlan" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Treatment plan</Label>
                <Textarea
                  id="treatmentPlan"
                  name="treatmentPlan"
                  value={formData.treatmentPlan}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Medications, therapies, recommendations..."
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="recordedAt" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Visit date</Label>
                  <Input
                    id="recordedAt"
                    name="recordedAt"
                    type="date"
                    value={formData.recordedAt}
                    onChange={handleChange}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="followUpDate" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Follow-up</Label>
                  <Input
                    id="followUpDate"
                    name="followUpDate"
                    type="date"
                    value={formData.followUpDate}
                    onChange={handleChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2 block">Additional notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Other observations or instructions..."
                  className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white resize-none"
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={submitting || !formData.petId}
              className={cn(
                "w-full h-14 rounded-2xl text-white font-semibold text-base transition-all shadow-lg hover:shadow-xl",
                `bg-gradient-to-r ${currentConfig.gradient}`
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Save {currentConfig.label}
                </span>
              )}
            </Button>
          </motion.div>
        </form>
      </Surface>
    </div>
  );
}
