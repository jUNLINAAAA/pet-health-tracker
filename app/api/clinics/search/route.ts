import { NextRequest, NextResponse } from 'next/server';
import { ClinicLocationService } from '@/lib/services';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const query = searchParams.get('q');
  const radius = searchParams.get('radius') || '10';

  try {
    if (query) {
      // Search by query string
      const clinics = await ClinicLocationService.searchClinicsByQuery(query);
      return NextResponse.json({ clinics });
    }

    if (lat && lng) {
      // Search by location
      const clinics = await ClinicLocationService.searchNearbyClinics(
        { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        parseFloat(radius)
      );
      return NextResponse.json({ clinics });
    }

    return NextResponse.json(
      { error: 'Please provide either coordinates (lat, lng) or a search query (q)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Clinic search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for clinics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, clinicId, clinic, address } = body;

    switch (action) {
      case 'save':
        if (!clinic) {
          return NextResponse.json({ error: 'Clinic data required' }, { status: 400 });
        }
        const savedClinic = await ClinicLocationService.saveClinic(clinic);
        return NextResponse.json({ clinic: savedClinic });

      case 'remove':
        if (!clinicId) {
          return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
        }
        await ClinicLocationService.removeClinic(clinicId);
        return NextResponse.json({ success: true });

      case 'favorite':
        if (!clinicId) {
          return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
        }
        await ClinicLocationService.toggleFavorite(clinicId);
        return NextResponse.json({ success: true });

      case 'geocode':
        if (!address) {
          return NextResponse.json({ error: 'Address required' }, { status: 400 });
        }
        const coords = await ClinicLocationService.geocodeAddress(address);
        return NextResponse.json({ coords });

      case 'saved':
        const savedClinics = await ClinicLocationService.getSavedClinics();
        return NextResponse.json({ clinics: savedClinics });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Clinic action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform clinic action' },
      { status: 500 }
    );
  }
}
