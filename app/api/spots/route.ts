import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km

  if (!type) {
    return NextResponse.json({ error: 'type parameter required' }, { status: 400 });
  }

  try {
    let data: any[] = [];

    switch (type) {
      case 'tourism_spot': {
        const { data: spots, error } = await supabase
          .from('tourism_spots')
          .select('*')
          .order('municipality');
        if (error) throw error;
        data = (spots || []).map(s => ({
          id: s.id,
          spot_id: s.spot_id,
          name: s.spot_name,
          category: s.category,
          sub_categories: s.sub_categories,
          municipality: s.municipality,
          address: s.address,
          lat: s.latitude,
          lng: s.longitude,
          description: s.description,
          business_hours: s.business_hours,
          closed_days: s.closed_days,
          fee: s.fee,
          phone: s.phone,
          access: s.access,
          parking: s.parking,
          website: s.website,
          source_url: s.source_url,
        }));
        break;
      }
      case 'hot_spring': {
        const { data: spots, error } = await supabase
          .from('onsen_spots')
          .select('*')
          .order('municipality');
        if (error) throw error;
        data = (spots || []).map(s => ({
          id: s.id,
          spot_id: s.spot_id,
          name: s.onsen_name,
          municipality: s.municipality,
          address: s.address,
          lat: s.latitude,
          lng: s.longitude,
          spring_quality: s.spring_quality,
          facility_type: s.facility_type,
          fee: s.fee,
          business_hours: s.business_hours,
          closed_days: s.closed_days,
          phone: s.phone,
          website: s.website,
          description: s.description,
          parking: s.parking,
          access: s.access,
          source_url: s.source_url,
        }));
        break;
      }
      case 'restaurant': {
        const { data: spots, error } = await supabase
          .from('local_food_spots')
          .select('*')
          .order('municipality');
        if (error) throw error;
        data = (spots || []).map(s => ({
          id: s.id,
          spot_id: s.spot_id,
          name: s.shop_name,
          cuisine_type: s.cuisine_type,
          municipality: s.municipality,
          address: s.address,
          lat: s.latitude,
          lng: s.longitude,
          business_hours: s.business_hours,
          closed_days: s.closed_days,
          price_range: s.price_range,
          phone: s.phone,
          website: s.website,
          description: s.description,
          parking: s.parking,
          access: s.access,
          source_url: s.source_url,
        }));
        break;
      }
      case 'toilet': {
        const { data: spots, error } = await supabase
          .from('toilet_spots')
          .select('*')
          .order('municipality');
        if (error) throw error;
        data = (spots || []).map(s => ({
          id: s.id,
          spot_id: s.spot_id,
          name: s.facility_name,
          municipality: s.municipality,
          address: s.address,
          lat: s.latitude,
          lng: s.longitude,
          toilet_type: s.toilet_type,
          barrier_free: s.barrier_free,
          business_hours: s.business_hours,
          source_url: s.source_url,
        }));
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    // Filter by distance if lat/lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      data = data
        .map(spot => {
          const R = 6371;
          const dLat = (spot.lat - userLat) * Math.PI / 180;
          const dLng = (spot.lng - userLng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(userLat * Math.PI / 180) * Math.cos(spot.lat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return { ...spot, distance };
        })
        .filter(spot => spot.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }

    return NextResponse.json({ spots: data, total: data.length });
  } catch (error: any) {
    console.error('Spots API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
