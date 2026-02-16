import { NextRequest, NextResponse } from 'next/server';
import { createFacilityReport, getFacilityReports } from '@/app/_actions/facility-reports';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;
  const { reports, error } = await getFacilityReports(type);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { facilityType, storeName, description, storeLatitude, storeLongitude, imageUrls, userId, reporterId } = body;

  if (!facilityType || !storeName || storeLatitude == null || storeLongitude == null) {
    return NextResponse.json({ error: '必須項目を入力してください。' }, { status: 400 });
  }

  const { reportId, error } = await createFacilityReport({
    facilityType,
    storeName,
    description,
    storeLatitude,
    storeLongitude,
    imageUrls,
    userId,
    reporterId,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ reportId }, { status: 201 });
}
