export interface GtfsBusStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string | null;
  zone_id?: string | null;
  location_type?: number;
  parent_station?: string | null;
}

export interface GtfsRoute {
  route_id: string;
  agency_id?: string | null;
  route_short_name?: string | null;
  route_long_name?: string | null;
  route_type: number;
  route_color?: string | null;
  route_text_color?: string | null;
}

export interface GtfsDeparture {
  departure_time: string;
  trip_headsign: string | null;
  service_days: string[];
}

export interface GtfsRouteWithDepartures {
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
  route_color: string | null;
  departures: GtfsDeparture[];
}

export interface GtfsMetadata {
  last_updated_at: string;
  data_source: string;
  notes: string | null;
}
