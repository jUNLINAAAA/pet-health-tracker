"use client";

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, PawPrint, Sparkles, Upload, X, Camera } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PetService, StorageService } from '@/lib/services';
import { useHealth } from '@/lib/health-context';

// Form validation schema
const petFormSchema = z.object({
  name: z.string().min(1, { message: 'Pet name is required' }),
  species: z.string().min(1, { message: 'Species is required' }),
  breed: z.string().optional(),
  age: z.coerce.number().min(0, { message: 'Age must be a positive number' }),
  weight: z.coerce.number().min(0, { message: 'Weight must be a positive number' }),
  gender: z.string().optional(),
  microchipId: z.string().optional(),
  image: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
});

// Infer the form values type from the schema
type PetFormValues = z.infer<typeof petFormSchema>;

export default function AddNewPetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { reload } = useHealth();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize the form with default values
  const form = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: '',
      species: '',
      breed: '',
      age: undefined,
      weight: undefined,
      gender: '',
      microchipId: '',
      image: '',
    },
  });

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setSelectedImage(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    // Clear URL input when file is selected
    form.setValue('image', '');
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submission handler
  const onSubmit = async (values: PetFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // First create the pet without image
      const result = await PetService.createPet({
        name: values.name,
        species: values.species,
        breed: values.breed || undefined,
        age: values.age,
        weight: values.weight,
        image: values.image || undefined, // Use URL if provided
      });

      if (!result || !result.id) {
        throw new Error("Failed to create pet - no pet ID returned");
      }

      // If a file was selected, upload it and update the pet
      if (selectedImage) {
        setIsUploadingImage(true);
        try {
          const uploadResult = await StorageService.uploadPetImage(selectedImage, result.id);
          // Update pet with the uploaded image URL
          await PetService.updatePet(result.id, { image: uploadResult.url });
          toast.success(`Added ${values.name} with photo!`);
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast.warning(`Pet created, but image upload failed. You can add a photo later.`);
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        toast.success(`Added ${values.name} to your pets!`);
      }

      // Reload health context before navigating so pet data is available
      await reload();
      router.push(`/dashboard/pets/${result.id}`);
    } catch (error: any) {
      console.error("Error creating pet:", error);
      setErrorMessage(error.message || "An unexpected error occurred. Please try again.");
      toast.error("Failed to create pet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container max-w-3xl mx-auto py-8">
      {isOnboarding ? (
        /* Onboarding header */
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Let&apos;s Add Your First Pet!
          </h1>
          <p className="text-slate-500 max-w-md mx-auto">
            Tell us about your furry friend. This information helps us provide personalized health insights.
          </p>
        </div>
      ) : (
        /* Regular header */
        <div className="flex items-center mb-6">
          <Link href="/dashboard/pets" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Add New Pet</h1>
        </div>
      )}

      {/* Info message - different for onboarding */}
      {isOnboarding ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 mb-6 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Quick Tips</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Fill in the required fields marked with *</li>
                <li>• You can always update this info later</li>
                <li>• Health scores are calculated automatically</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Please fill in all required fields to create a pet profile.
                Pet health scores will be calculated automatically based on various factors including age, weight, and health records.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Authentication Error</span>
          </div>
          <p className="text-sm text-red-700">{errorMessage}</p>
          {errorMessage.includes("Authentication") && (
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push(`/auth/login?returnTo=${encodeURIComponent('/dashboard/pets/new')}`)}
                className="text-sm"
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>
      )}
      
      <Card className={isOnboarding ? "border-0 shadow-xl shadow-slate-200/50" : ""}>
        <CardHeader>
          <CardTitle>{isOnboarding ? "Pet Details" : "Pet Information"}</CardTitle>
          <CardDescription>
            {isOnboarding
              ? "Just the basics - you can add more details anytime."
              : "Enter your pet's details below. Fields marked with * are required."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Pet&rsquo;s name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select species" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dog">Dog</SelectItem>
                          <SelectItem value="Cat">Cat</SelectItem>
                          <SelectItem value="Bird">Bird</SelectItem>
                          <SelectItem value="Rabbit">Rabbit</SelectItem>
                          <SelectItem value="Hamster">Hamster</SelectItem>
                          <SelectItem value="Fish">Fish</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="breed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Breed</FormLabel>
                      <FormControl>
                        <Input placeholder="Breed (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age (years) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Age in years"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Weight in kg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="microchipId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Microchip ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Microchip ID (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Image Upload Section - Full Width */}
                <div className="col-span-1 md:col-span-2">
                  <FormItem>
                    <FormLabel>Pet Photo</FormLabel>
                    <div className="space-y-4">
                      {/* Image Preview */}
                      {imagePreview ? (
                        <div className="relative w-full max-w-xs mx-auto">
                          <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                            <Image
                              src={imagePreview}
                              alt="Pet preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        /* Upload Area */
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="relative cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                              <Camera className="h-7 w-7 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                Click to upload a photo
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                JPEG, PNG, GIF or WebP (max 5MB)
                              </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2">
                              <Upload className="mr-2 h-4 w-4" />
                              Choose File
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />

                      {/* Or use URL */}
                      {!selectedImage && (
                        <div className="space-y-2">
                          <div className="relative flex items-center">
                            <div className="flex-grow border-t border-slate-200" />
                            <span className="mx-4 flex-shrink text-xs text-slate-400">or paste URL</span>
                            <div className="flex-grow border-t border-slate-200" />
                          </div>
                          <FormField
                            control={form.control}
                            name="image"
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/pet-photo.jpg"
                                  {...field}
                                  className="text-sm"
                                />
                              </FormControl>
                            )}
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                </div>
              </div>
              
              <div className={`flex ${isOnboarding ? 'justify-center' : 'justify-end'} space-x-4`}>
                {!isOnboarding && (
                  <Link href="/dashboard/pets">
                    <Button type="button" variant="outline">Cancel</Button>
                  </Link>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className={`bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 ${isOnboarding ? 'px-8 py-6 text-lg shadow-lg shadow-blue-500/25' : ''}`}
                >
                  {isSubmitting || isUploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploadingImage ? 'Uploading Photo...' : isOnboarding ? 'Creating Profile...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      {isOnboarding && <PawPrint className="mr-2 h-5 w-5" />}
                      {isOnboarding ? 'Create Pet Profile' : 'Add Pet'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
