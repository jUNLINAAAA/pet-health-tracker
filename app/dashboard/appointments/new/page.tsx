"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Check, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumb from '@/components/Breadcrumb';
import { PetService, AppointmentService, StorageService } from '@/lib/services';
import Image from 'next/image';
import ClinicFinder from '@/components/ClinicFinder';

enum AppointmentType {
  CHECKUP = 'checkup',
  VACCINATION = 'vaccination',
  SURGERY = 'surgery',
  DENTAL = 'dental',
  GROOMING = 'grooming',
  SICK_VISIT = 'sick_visit',
  EMERGENCY = 'emergency',
  OTHER = 'other'
}

// Define an interface for the form data
interface AppointmentFormData {
  petId: string;
  title: string;
  date: string;
  time: string;
  veterinarian: string;
  location: string;
  type: AppointmentType;
  notes: string;
  symptoms: {
    primarySymptom: string;
    secondarySymptoms: string;
    duration: string;
    severity: string;
    onsetDate: string;
    progression: string;
    triggers: string;
  };
  diagnosis: string;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<AppointmentFormData>({
    petId: '',
    title: '',
    date: '',
    time: '',
    veterinarian: '',
    location: '',
    type: AppointmentType.CHECKUP,
    notes: '',
    symptoms: {
      primarySymptom: '',
      secondarySymptoms: '',
      duration: '',
      severity: 'moderate',
      onsetDate: '',
      progression: 'stable',
      triggers: ''
    },
    diagnosis: ''
  });
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Image upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const loadPets = async () => {
      try {
        setLoading(true);
        const petsData = await PetService.getPets();
        setPets(petsData);

        // Set first pet as default if available
        if (petsData.length > 0) {
          setFormData(prev => ({
            ...prev,
            petId: petsData[0].id
          }));
        }
      } catch (error) {
        console.error('Error loading pets:', error);
        toast.error('Failed to load pets');
      } finally {
        setLoading(false);
      }
    };

    loadPets();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties for symptoms
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      if (parent === 'symptoms') {
        setFormData(prev => ({
          ...prev,
          symptoms: {
            ...prev.symptoms,
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxImages = 5;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      if (selectedImages.length + newFiles.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Use JPEG, PNG, GIF, or WebP.`);
        return;
      }

      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max 5MB.`);
        return;
      }

      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    if (newFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...newFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!formData.petId) {
      toast.error('Please select a pet');
      return;
    }

    if (!formData.title) {
      toast.error('Please enter an appointment title');
      return;
    }

    if (!formData.date) {
      toast.error('Please select an appointment date');
      return;
    }

    setSubmitting(true);

    try {
      const result = await AppointmentService.createAppointment({
        petId: formData.petId,
        title: formData.title,
        date: formData.date,
        time: formData.time || undefined,
        location: formData.location || undefined,
        veterinarian: formData.veterinarian || undefined,
        notes: formData.notes || undefined,
      });

      if (result) {
        // Upload images if any were selected
        if (selectedImages.length > 0) {
          toast.info('Uploading attachments...');
          const uploadPromises = selectedImages.map((file) =>
            StorageService.uploadAppointmentAttachment(file, result.id)
          );

          try {
            await Promise.all(uploadPromises);
            toast.success('Appointment scheduled with attachments!');
          } catch (uploadError) {
            console.error('Error uploading attachments:', uploadError);
            toast.warning('Appointment created but some attachments failed to upload.');
          }
        } else {
          toast.success('Appointment scheduled successfully!');
        }

        // Clean up previews
        imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));

        router.push('/dashboard/appointments');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Error creating appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Appointments', href: '/dashboard/appointments' },
          { label: 'New Appointment', href: '/dashboard/appointments/new' },
        ]}
      />
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule New Appointment</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/appointments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
      </div>
      
      {loading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No Pets Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              You need to add a pet before you can schedule an appointment.
            </p>
            <Button onClick={() => router.push('/dashboard/pets/new')}>
              Add a Pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="petId">Select Pet</Label>
                  <select
                    id="petId"
                    name="petId"
                    value={formData.petId}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    {pets.map(pet => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species} - {pet.breed})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Appointment Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Routine Checkup, Vaccination, etc."
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Appointment Type</Label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {Object.values(AppointmentType).map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      name="time"
                      type="time"
                      value={formData.time}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="veterinarian">Veterinarian</Label>
                    <Input
                      id="veterinarian"
                      name="veterinarian"
                      placeholder="Dr. Smith"
                      value={formData.veterinarian}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Pet Clinic"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Clinic Finder */}
                <div className="space-y-2">
                  <Label>Find a Clinic</Label>
                  <ClinicFinder
                    petId={formData.petId}
                    onSelectClinic={(clinic) => {
                      setFormData(prev => ({
                        ...prev,
                        location: clinic.address || clinic.name,
                        veterinarian: clinic.veterinarian || prev.veterinarian,
                      }));
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Search for nearby veterinary clinics or select from your recent visits
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any important details or information about this appointment"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label>Attachments (Optional)</Label>
                  <p className="text-xs text-slate-500">
                    Upload photos of symptoms, previous test results, or relevant documents (max 5 images, 5MB each)
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                  />

                  <div className="flex flex-wrap gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={preview}
                            alt={`Attachment ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {selectedImages.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors flex flex-col items-center justify-center gap-1"
                      >
                        <Upload className="h-5 w-5 text-gray-400" />
                        <span className="text-xs text-gray-500">Add</span>
                      </button>
                    )}
                  </div>

                  {selectedImages.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-gray-50 border-t border-gray-200 p-6 flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/appointments')}
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Scheduling...
                  </div>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {formData.type === AppointmentType.SICK_VISIT || formData.type === AppointmentType.EMERGENCY ? (
        <div className="space-y-4 mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-medium text-amber-800">Symptom Information</h3>
          <p className="text-sm text-amber-700 mb-4">
            Providing detailed symptom information helps veterinarians prepare for your visit.
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="primarySymptom">Primary Symptom</Label>
              <Input 
                id="primarySymptom" 
                name="symptoms.primarySymptom"
                value={formData.symptoms.primarySymptom}
                onChange={handleInputChange}
                placeholder="Main reason for visit"
              />
            </div>
            
            <div>
              <Label htmlFor="secondarySymptoms">Secondary Symptoms</Label>
              <Input 
                id="secondarySymptoms" 
                name="symptoms.secondarySymptoms"
                value={formData.symptoms.secondarySymptoms}
                onChange={handleInputChange}
                placeholder="Additional symptoms (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple symptoms with commas</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input 
                  id="duration" 
                  name="symptoms.duration"
                  value={formData.symptoms.duration}
                  onChange={handleInputChange}
                  placeholder="How long has this been happening?"
                />
              </div>
              
              <div>
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  name="symptoms.severity"
                  value={formData.symptoms.severity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="onsetDate">Onset Date</Label>
                <Input 
                  id="onsetDate" 
                  name="symptoms.onsetDate"
                  type="date"
                  value={formData.symptoms.onsetDate}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="progression">Progression</Label>
                <select
                  id="progression"
                  name="symptoms.progression"
                  value={formData.symptoms.progression}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="improving">Improving</option>
                  <option value="stable">Stable</option>
                  <option value="worsening">Worsening</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="triggers">Known Triggers</Label>
              <Input 
                id="triggers" 
                name="symptoms.triggers"
                value={formData.symptoms.triggers}
                onChange={handleInputChange}
                placeholder="What makes symptoms worse? (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple triggers with commas</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add diagnosis field after symptoms section */}
      {formData.type === AppointmentType.SICK_VISIT || formData.type === AppointmentType.EMERGENCY ? (
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="diagnosis">Diagnosis (if known)</Label>
            <Textarea 
              id="diagnosis" 
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleInputChange}
              placeholder="Enter veterinarian's diagnosis if you already know it"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              You can leave this blank and update it after your appointment.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
} 
