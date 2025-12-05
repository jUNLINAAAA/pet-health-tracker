import { NextRequest, NextResponse } from 'next/server';
import { ClinicLocationService } from '@/lib/services';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const petId = searchParams.get('petId');
  const suggested = searchParams.get('suggested') === 'true';

  try {
    if (suggested) {
      const vets = await ClinicLocationService.getSuggestedVets(petId || undefined);
      return NextResponse.json({ vets });
    }

    const history = await ClinicLocationService.getVetHistory(petId || undefined);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Vet history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch veterinarian history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      petId,
      veterinarianName,
      clinicName,
      clinicAddress,
      latitude,
      longitude,
      clinicId,
      appointmentId,
      visitDate,
      visitType,
      notes,
      rating,
      wouldRecommend,
    } = body;

    if (!veterinarianName || !visitDate) {
      return NextResponse.json(
        { error: 'Veterinarian name and visit date are required' },
        { status: 400 }
      );
    }

    const result = await ClinicLocationService.recordVetVisit({
      petId,
      veterinarianName,
      clinicName,
      clinicAddress,
      latitude,
      longitude,
      clinicId,
      appointmentId,
      visitDate,
      visitType,
      notes,
      rating,
      wouldRecommend,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to record visit' },
        { status: 500 }
      );
    }

    return NextResponse.json({ visit: result });
  } catch (error) {
    console.error('Record vet visit error:', error);
    return NextResponse.json(
      { error: 'Failed to record veterinarian visit' },
      { status: 500 }
    );
  }
}
