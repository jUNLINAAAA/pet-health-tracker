'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PawPrint } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
  image?: string;
}

interface PetSelectorProps {
  pets: Pet[];
  currentPetId?: string;
}

export default function PetSelector({ pets, currentPetId }: PetSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Handle pet selection change
  const handlePetChange = (petId: string) => {
    // Logic for determining where to navigate based on the pathname
    if (pathname && pathname.includes('/pets/')) {
      // If we're on a specific pet page, navigate to the same page for the selected pet
      router.push(`/dashboard/pets/${petId}`);
    } else if (pathname && pathname.includes('/health/')) {
      // For health records, navigate to the health records for the selected pet
      router.push(`/dashboard/health/${petId}`);
    } else {
      // Default to the pet details page
      router.push(`/dashboard/pets/${petId}`);
    }
  };
  
  if (pets.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">No pets available</div>
    );
  }
  
  return (
    <div className="flex gap-4 items-center">
      <Select 
        value={currentPetId || ''} 
        onValueChange={handlePetChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a pet" />
        </SelectTrigger>
        <SelectContent>
          {pets.map((pet) => (
            <SelectItem key={pet.id} value={pet.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={pet.image || ''} alt={pet.name} />
                  <AvatarFallback>
                    <PawPrint className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span>{pet.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Display quick-access buttons for pets */}
      <div className="hidden md:flex gap-2">
        {pets.slice(0, 3).map((pet) => (
          <Link 
            key={pet.id} 
            href={`/dashboard/pets/${pet.id}`}
            className={`
              inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm
              ${currentPetId === pet.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}
            `}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={pet.image || ''} alt={pet.name} />
              <AvatarFallback>
                <PawPrint className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            {pet.name}
          </Link>
        ))}
        
        {pets.length > 3 && (
          <span className="text-sm text-muted-foreground px-2">
            +{pets.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
} 