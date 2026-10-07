"use client";

import dynamic from "next/dynamic";
import { FormEvent, useRef, useState } from "react";

const LocationMap = dynamic(() => import("./LocationMap"), { ssr: false, loading: () => <div className="map-placeholder">Loading OpenStreetMap...</div> });
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export type AddressDetails = {
  province: string | null;
  municipality: string | null;
  city: string | null;
  town: string | null;
  area: string | null;
  suburb: string | null;
  road: string | null;
  postcode: string | null;
  zoneBlock: string | null;
};

export type NominatimPlace = {
  geocoderPlaceId: string | null;
  osmType: string | null;
  osmId: string | null;
  displayName: string;
  latitude: number;
  longitude: number;
  address: AddressDetails;
};

export type PowerTrackMatch = {
  zoneBlockId: string;
  zoneBlockName: string;
  latitude: number;
  longitude: number;
  suburbName: string;
  areaName: string;
  cityName: string;
  provinceName: string;
  distanceMeters: number;
};

type LocationPickerProps = {
  value: NominatimPlace | null;
  onChange: (place: NominatimPlace) => void;
  onConfirm: (place: NominatimPlace, match: PowerTrackMatch | null) => void;
};

async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Location request failed.");
  return data;
}

function approximatePlace(latitude: number, longitude: number): NominatimPlace {
  return {
    geocoderPlaceId: null,
    osmType: null,
    osmId: null,
    displayName: "Dropped pin · address not found",
    latitude,
    longitude,
    address: { province: null, municipality: null, city: null, town: null, area: null, suburb: null, road: null, postcode: null, zoneBlock: null },
  };
}

function geolocationError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "Location permission was denied. You can still search for or place the pin manually.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Your current location is unavailable. Try address search or move the map pin.";
  if (error.code === error.TIMEOUT) return "Finding your current location timed out. Try again or search for an address.";
  return "Could not determine your current location.";
}

export default function LocationPicker({ value, onChange, onConfirm }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimPlace[]>([]);
  const [matches, setMatches] = useState<PowerTrackMatch[] | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);
  const matchRequestId = useRef(0);

  async function reverseLookup(latitude: number, longitude: number) {
    const thisRequest = ++requestId.current;
    matchRequestId.current += 1;
    setError("");
    setNotice("");
    setMatches(null);
    setSelectedMatchId("");
    setConfirmed(false);
    onChange(approximatePlace(latitude, longitude));
    try {
      const response = await fetch(`${API}/location/reverse?lat=${latitude}&lon=${longitude}`);
      const place = await responseJson(response);
      if (thisRequest !== requestId.current) return;
      onChange(place);
    } catch (reason) {
      if (thisRequest !== requestId.current) return;
      setError(reason instanceof Error ? reason.message : "Could not look up this address.");
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    const thisRequest = ++requestId.current;
    setError("");
    setNotice("");
    setResults([]);
    setMatches(null);
    if (term.length < 3) {
      setError("Enter at least three characters to search an address.");
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`${API}/location/search?q=${encodeURIComponent(term)}`);
      const data: NominatimPlace[] = await responseJson(response);
      if (thisRequest !== requestId.current) return;
      setResults(data);
      if (!data.length) setNotice("No South African addresses found. Try a nearby suburb or town name.");
    } catch (reason) {
      if (thisRequest === requestId.current) setError(reason instanceof Error ? reason.message : "Address search is unavailable.");
    } finally {
      if (thisRequest === requestId.current) setSearching(false);
    }
  }

  function chooseResult(place: NominatimPlace) {
    requestId.current += 1;
    matchRequestId.current += 1;
    setResults([]);
    setMatches(null);
    setSelectedMatchId("");
    setConfirmed(false);
    setError("");
    setNotice("");
    onChange(place);
  }

  function useCurrentLocation() {
    setError("");
    setNotice("");
    if (!navigator.geolocation) {
      setError("This browser does not support location access. Search for an address or move the pin on the map.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      void reverseLookup(position.coords.latitude, position.coords.longitude).finally(() => setLocating(false));
    }, (reason) => {
      setError(geolocationError(reason));
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  async function findScheduleMatches() {
    if (!value) return;
    const thisRequest = ++matchRequestId.current;
    setMatching(true);
    setError("");
    setNotice("");
    setSelectedMatchId("");
    try {
      const response = await fetch(`${API}/location/match?lat=${value.latitude}&lon=${value.longitude}`);
      const data: { matches: PowerTrackMatch[] } = await responseJson(response);
      if (thisRequest !== matchRequestId.current) return;
      setMatches(data.matches);
      if (!data.matches.length) setNotice("This location is valid, but PowerTrack does not currently have a matching schedule area for it.");
    } catch (reason) {
      if (thisRequest === matchRequestId.current) setError(reason instanceof Error ? reason.message : "Could not check for a PowerTrack schedule area.");
    } finally {
      if (thisRequest === matchRequestId.current) setMatching(false);
    }
  }

  function confirmPlace() {
    if (!value) return;
    if (matches === null) {
      void findScheduleMatches();
      return;
    }
    const match = matches.find((candidate) => candidate.zoneBlockId === selectedMatchId) || null;
    if (matches.length && !match) {
      setError("Choose the verified PowerTrack Zone/Block that matches your location.");
      return;
    }
    setConfirmed(true);
    onConfirm(value, match);
  }

  const selectedLine = value ? [value.address.road, value.address.suburb, value.address.area, value.address.city || value.address.town, value.address.municipality, value.address.province, value.address.postcode].filter(Boolean).join(", ") : "";
  const markerPoint = value ? { latitude: value.latitude, longitude: value.longitude } : null;

  return <section className="physical-location-picker" aria-labelledby="physical-location-heading">
    <div className="picker-heading"><div><div className="status-label">My Area</div><h2 id="physical-location-heading" className="section-title">Where are you located?</h2></div><button className="button geolocate-button" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? "Finding location..." : "Use My Current Location"}</button></div>

    <div className="picker-grid">
      <div className="picker-column picker-controls">
        <form className="address-search-form" onSubmit={search}><label className="visually-hidden" htmlFor="physical-location-query">Search a South African address</label><input id="physical-location-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your address, suburb or town" autoComplete="street-address" /><button className="button" type="submit" disabled={searching}>{searching ? "Searching..." : "Search"}</button></form>
        {error && <div className="error picker-message" role="alert">{error}</div>}{notice && <div className="geo-notice picker-message" role="status">{notice}</div>}
        {searching && <div className="picker-loading" role="status">Searching South African addresses...</div>}
        {results.length > 0 && <div className="geo-results" aria-label="Address search results">{results.map((place) => <button type="button" className="geo-result" key={`${place.osmType}-${place.osmId}-${place.geocoderPlaceId}`} onClick={() => chooseResult(place)}><strong>{place.displayName}</strong><span>{[place.address.suburb, place.address.area, place.address.city || place.address.town, place.address.municipality, place.address.province].filter(Boolean).join(", ")}</span></button>)}</div>}
      </div>

      <div className="picker-column picker-map-wrap">
        <div className="picker-map"><LocationMap points={[]} focusId="" selectedPoint={markerPoint} onSelect={() => {}} onMapClick={(latitude, longitude) => void reverseLookup(latitude, longitude)} onMarkerMoved={(latitude, longitude) => void reverseLookup(latitude, longitude)} /></div>
        <div className="map-attribution">© OpenStreetMap contributors</div>
      </div>
    </div>

    {value && !confirmed && <div className="physical-selection"><div className="status-label">Selected Location</div><strong>{value.displayName}</strong><p className="muted">{selectedLine || "Address details are approximate or unavailable."}</p><p className="muted">Coordinates: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</p>
      {matches && matches.length > 0 && <fieldset className="zone-candidates"><legend>Choose your verified PowerTrack schedule area</legend>{matches.map((match) => <label className="zone-candidate" key={match.zoneBlockId}><input type="radio" name="powertrack-zone-match" value={match.zoneBlockId} checked={selectedMatchId === match.zoneBlockId} onChange={() => setSelectedMatchId(match.zoneBlockId)} /><span><strong>{match.zoneBlockName}</strong><small>{match.suburbName} → {match.areaName} → {match.cityName} → {match.provinceName} · {Math.round(match.distanceMeters)} m</small></span></label>)}</fieldset>}
      <div className="picker-actions"><button className="nav" type="button" onClick={() => { setMatches(null); setSelectedMatchId(""); setConfirmed(false); }}>Adjust Location</button><button className="button" type="button" onClick={confirmPlace} disabled={matching}>{matching ? "Checking schedule area..." : matches === null ? "Check & Confirm Location" : "Confirm Location"}</button></div>
    </div>}
  </section>;
}
