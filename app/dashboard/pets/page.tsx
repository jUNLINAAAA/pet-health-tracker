"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PetService, type Pet } from "@/lib/services";
import { Plus, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const formatAddedDate = (value?: string) => {
  if (!value) return "Demo data";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Demo data" : date.toLocaleDateString();
};

const renderInitial = (name: string) => (
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-lg font-semibold text-slate-600">
    {name.slice(0, 1).toUpperCase()}
  </div>
);

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    
    async function loadPets() {
      try {
        setLoading(true);
        const userPets = await PetService.getPets();
        setPets(userPets);
      } catch (err) {
        console.error("Error loading pets:", err);
        setError("Failed to load your pets. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    loadPets();
  }, []);

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Your Pets</h1>
        <Link href="/dashboard/pets/new" className="w-full sm:w-auto">
          <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white w-full sm:w-auto text-sm sm:text-base">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Add Pet
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <div className="mx-auto flex flex-col items-center max-w-sm">
            <div className="h-10 w-10 border-2 border-t-transparent border-[#6366f1] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Loading your pets...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <div className="mx-auto flex flex-col items-center max-w-sm">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white">
              Try Again
            </Button>
          </div>
        </Card>
      ) : pets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {pets.map((pet) => (
            <Link href={`/dashboard/pets/${pet.id}`} key={pet.id}>
              <Card className="group h-full cursor-pointer overflow-hidden p-4 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                <div className="relative mb-3 sm:mb-4 h-32 sm:h-40 w-full overflow-hidden rounded-2xl bg-slate-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-slate-900/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {pet.image ? (
                    <Image
                      src={pet.image}
                      alt={pet.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    renderInitial(pet.name)
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 shadow-sm">
                    {pet.species}
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold truncate">{pet.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {pet.age && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {pet.age} {pet.age === 1 ? 'yr' : 'yrs'}
                    </span>
                  )}
                  {pet.weight ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {pet.weight} kg
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-dashed border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
                      Log weight
                    </span>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[10px] sm:text-xs text-gray-400">
                    Added on {formatAddedDate(pet.createdAt)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto flex flex-col items-center max-w-sm">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No pets yet</h2>
            <p className="text-gray-500 mb-4">
              Add your first pet to start tracking their health and activities
            </p>
            <Link href="/dashboard/pets/new">
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Pet
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
