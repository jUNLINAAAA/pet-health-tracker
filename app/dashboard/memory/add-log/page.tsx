"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { PetService, HealthRecordService } from '@/lib/services';
import type { Pet } from '@/lib/services/types';

export default function AddDailyLogPage() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    petId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    appetite: "normal",
    waterIntake: "normal",
    activity: "normal",
    urination: "normal",
    stool: "normal",
    behavior: "normal",
    notes: "",
  });
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const petsData = await PetService.getPets();
        setPets(petsData);

        if (petsData.length > 0) {
          setFormData(prev => ({ ...prev, petId: petsData[0].id }));
        }
      } catch (error) {
        console.error("Error loading pets:", error);
        toast.error("Could not load pets. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validate form
      if (!formData.petId) throw new Error("Please select a pet");
      if (!formData.date) throw new Error("Please select a date");

      // Build the notes to include all daily log info
      const logDetails = [
        `Daily Log - ${formData.date}`,
        `Appetite: ${formData.appetite}`,
        `Water Intake: ${formData.waterIntake}`,
        `Activity: ${formData.activity}`,
        `Urination: ${formData.urination}`,
        `Stool: ${formData.stool}`,
        `Behavior: ${formData.behavior}`,
        formData.notes ? `Notes: ${formData.notes}` : null
      ].filter(Boolean).join('\n');

      // Create a health record to store the daily log
      await HealthRecordService.createHealthRecord({
        petId: formData.petId,
        type: 'daily_log',
        value: 0, // Not applicable for daily logs
        unit: 'log',
        notes: logDetails,
        recordedAt: new Date(formData.date).toISOString(),
      });

      toast.success("Daily log added successfully!");
      router.push('/dashboard/memory');
    } catch (error: any) {
      console.error("Error adding daily log:", error);
      setError(error.message || "Failed to add daily log");
      toast.error(error.message || "Failed to add daily log");
      setSubmitting(false);
    }
  };

  const handlePhotoCapture = () => {
    toast.info("Photo capture feature coming soon");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info("Photo upload feature coming soon");
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-6">
        <Link href="/dashboard/memory" className="text-sm text-blue-600 hover:underline inline-flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Memory Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8">Add Daily Log</h1>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="petId">Select Pet</Label>
                  <select
                    id="petId"
                    name="petId"
                    value={formData.petId}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select a pet</option>
                    {pets.map(pet => (
                      <option key={pet.id} value={pet.id}>{pet.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="appetite">Appetite</Label>
                  <select
                    id="appetite"
                    name="appetite"
                    value={formData.appetite}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="increased">Increased</option>
                    <option value="decreased">Decreased</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="waterIntake">Water Intake</Label>
                  <select
                    id="waterIntake"
                    name="waterIntake"
                    value={formData.waterIntake}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="increased">Increased</option>
                    <option value="decreased">Decreased</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="activity">Activity Level</Label>
                  <select
                    id="activity"
                    name="activity"
                    value={formData.activity}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="increased">Increased</option>
                    <option value="decreased">Decreased</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="urination">Urination</Label>
                  <select
                    id="urination"
                    name="urination"
                    value={formData.urination}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="increased">Increased</option>
                    <option value="decreased">Decreased</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="stool">Stool</Label>
                  <select
                    id="stool"
                    name="stool"
                    value={formData.stool}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="diarrhea">Diarrhea</option>
                    <option value="constipation">Constipation</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="behavior">Behavior</Label>
                  <select
                    id="behavior"
                    name="behavior"
                    value={formData.behavior}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="lethargic">Lethargic</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="anxious">Anxious</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add any additional observations or details about your pet's day"
                />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="flex justify-center gap-4 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePhotoCapture}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>

                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">
                  Add photos to document your pet&rsquo;s condition
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                  <p className="text-sm">Error: {error}</p>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Link href="/dashboard/memory">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  disabled={submitting}
                >
                  {submitting ? "Adding Log..." : "Save Daily Log"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
