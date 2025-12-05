"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useHealth } from '@/lib/health-context';
import { AppointmentService, StorageService } from '@/lib/services';
import ClinicFinder from '@/components/ClinicFinder';

export default function EditAppointmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { appointments, pets, reload } = useHealth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    veterinarian: '',
    notes: '',
    petId: '',
  });

  useEffect(() => {
    const appointment = appointments.find(a => a.id === params.id);
    if (appointment) {
      setFormData({
        title: appointment.title || '',
        date: appointment.date || '',
        time: appointment.time || '',
        location: (appointment as any).location || '',
        veterinarian: (appointment as any).veterinarian || '',
        notes: (appointment as any).notes || '',
        petId: appointment.petId || '',
      });
      setLoading(false);
    } else if (appointments.length > 0) {
      // Appointments loaded but this one not found
      toast.error('Appointment not found');
      router.push('/dashboard/appointments');
    }
  }, [params.id, appointments, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a title for the appointment');
      return;
    }

    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    setSubmitting(true);

    try {
      await AppointmentService.updateAppointment(params.id, {
        title: formData.title,
        date: formData.date,
        time: formData.time || undefined,
        location: formData.location || undefined,
        veterinarian: formData.veterinarian || undefined,
        notes: formData.notes || undefined,
      });

      toast.success('Appointment updated successfully!');
      await reload();
      router.push(`/dashboard/appointments/${params.id}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await StorageService.deleteAppointmentAttachments(params.id);
      await AppointmentService.deleteAppointment(params.id);
      toast.success('Appointment deleted successfully');
      await reload();
      router.push('/dashboard/appointments');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const pet = pets.find(p => p.id === formData.petId);

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-slate-500">Loading appointment data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Appointment</h1>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
          {pet && (
            <p className="text-sm text-slate-500">
              For: {pet.name} ({pet.species})
            </p>
          )}
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Annual Checkup"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
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
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Main Street Veterinary Clinic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="veterinarian">Veterinarian</Label>
                <Input
                  id="veterinarian"
                  name="veterinarian"
                  value={formData.veterinarian}
                  onChange={handleChange}
                  placeholder="e.g., Dr. Smith"
                />
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
                  Search for nearby clinics or select from your recent visits
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about this appointment..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={submitting || deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Appointment?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                This action cannot be undone. Are you sure you want to delete &ldquo;{formData.title}&rdquo;?
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
