"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MapPoint } from "../../components/LocationMap";

const LocationMap = dynamic(() => import("../../components/LocationMap"), { ssr: false, loading: () => <div className="map-placeholder">Loading South Africa map...</div> });
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

type PowerLocation = {
  zoneBlockId: string;
  zoneBlockName: string;
  zoneBlockOfficialName?: string;
    geocoderPlaceId?: string;
  latitude: number | null;
  longitude: number | null;
  suburbId: string;
  suburbName: string;
  areaId: string;
  areaName: string;
  cityId: string;
  cityName: string;
  provinceId: string;
  provinceName: string;
};
type PlaceFeature = {
  geocoderPlaceId: string | null;
  osmType: string | null;
  osmId: string | null;
  displayName: string;
  latitude: number;
  longitude: number;
  address: { province: string | null; municipality: string | null; city: string | null; town: string | null; area: string | null; suburb: string | null; road: string | null; postcode: string | null; zoneBlock: string | null };
};
type LocationForm = { province: string; city: string; area: string; suburb: string; zoneBlock: string };
const emptyForm: LocationForm = { province: "", city: "", area: "", suburb: "", zoneBlock: "" };

export default function AdminLocations() {
  const router = useRouter();
  const [locations, setLocations] = useState<PowerLocation[]>([]);
  const [filter, setFilter] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [mapResults, setMapResults] = useState<PlaceFeature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<PlaceFeature | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PowerLocation | null>(null);
  const [editingLocation, setEditingLocation] = useState<PowerLocation | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = useCallback(() => localStorage.getItem("powertrack_token") || "", []);
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token()}` }), [token]);
  const requireAccessToken = useCallback(() => {
    const accessToken = token();
    if (!accessToken) {
      localStorage.removeItem("powertrack_token");
      setError("Authentication required. Please sign in again.");
      router.replace("/admin/login");
      return null;
    }
    return accessToken;
  }, [router, token]);

  const loadLocations = useCallback(async (search: string) => {
    const accessToken = requireAccessToken();
    if (!accessToken) return;
    try {
      const response = await fetch(`${API}/admin/locations?q=${encodeURIComponent(search)}`, { headers: { ...authHeaders() } });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("powertrack_token");
        router.replace("/admin/login");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load locations.");
      setLocations(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load locations.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, requireAccessToken, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadLocations(filter); }, 250);
    return () => window.clearTimeout(timer);
  }, [filter, loadLocations]);

  const points = useMemo<MapPoint[]>(() => [
    ...locations.flatMap((location) => location.latitude === null || location.longitude === null ? [] : [{
      id: location.zoneBlockId,
      label: `${location.zoneBlockName}, ${location.suburbName}`,
      latitude: location.latitude,
      longitude: location.longitude,
      kind: selectedLocation?.zoneBlockId === location.zoneBlockId ? "selected" as const : "saved" as const,
    }]),
    ...(selectedFeature ? [{
      id: `osm:${selectedFeature.osmType || "place"}/${selectedFeature.osmId || selectedFeature.geocoderPlaceId || "selected"}`,
      label: selectedFeature.displayName,
      latitude: selectedFeature.latitude,
      longitude: selectedFeature.longitude,
      kind: "selected" as const,
    }] : []),
  ], [locations, selectedFeature, selectedLocation]);

  function selectSavedLocation(location: PowerLocation) {
    setSelectedLocation(location);
    setEditingLocation(location);
    setSelectedFeature(null);
    setForm({ province: location.provinceName, city: location.cityName, area: location.areaName, suburb: location.suburbName, zoneBlock: location.zoneBlockName });
    setNotice("");
    setError("");
  }

  function chooseFeature(feature: PlaceFeature) {
    setSelectedFeature(feature);
    if (!editingLocation) setSelectedLocation(null);
    setForm({
      province: feature.address.province || "",
      city: feature.address.municipality || feature.address.city || feature.address.town || "",
      area: feature.address.area || "",
      suburb: feature.address.suburb || "",
      zoneBlock: feature.address.zoneBlock || "",
    });
    setMapResults([]);
    setNotice("");
    setError("");
  }

  async function searchMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mapQuery.trim().length < 2) return;
    setSearching(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/location/search?q=${encodeURIComponent(mapQuery.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Address search failed.");
      setMapResults(data);
      if (data.length === 0) setNotice("No South African places matched that search.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Address search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessToken = requireAccessToken();
    if (!accessToken) return;
    if (!selectedFeature && !selectedLocation) {
      setError("Choose an OpenStreetMap place or an existing PowerTrack location first.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const editing = Boolean(editingLocation);
      const response = await fetch(editing ? `${API}/admin/locations/${editingLocation?.zoneBlockId}` : `${API}/admin/locations`, {
        method: editing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(editing ? {
          province: form.province,
          city: form.city,
          area: form.area,
          suburb: form.suburb,
          zoneBlock: form.zoneBlock,
          officialName: selectedFeature?.displayName || editingLocation?.zoneBlockOfficialName || form.zoneBlock,
          geocoderPlaceId: selectedFeature?.geocoderPlaceId,
          osmType: selectedFeature?.osmType,
          osmId: selectedFeature?.osmId,
          latitude: selectedFeature?.latitude ?? editingLocation?.latitude,
          longitude: selectedFeature?.longitude ?? editingLocation?.longitude,
        } : {
          geocoderPlaceId: selectedFeature?.geocoderPlaceId,
          osmType: selectedFeature?.osmType,
          osmId: selectedFeature?.osmId,
          officialName: selectedFeature?.displayName,
          latitude: selectedFeature?.latitude,
          longitude: selectedFeature?.longitude,
          province: { name: form.province },
          city: { name: form.city },
          area: { name: form.area },
          suburb: { name: form.suburb },
          zoneBlock: { name: form.zoneBlock },
        }),
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("powertrack_token");
        router.replace("/admin/login");
        setError("Authentication required. Please sign in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save location.");
      setSelectedLocation(null);
      setEditingLocation(null);
      setSelectedFeature(null);
      setForm(emptyForm);
      setNotice(editing ? "Location updated successfully." : "Location added successfully.");
      await loadLocations(filter);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save location.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation(location: PowerLocation) {
    if (!window.confirm(`Delete ${location.zoneBlockName}, ${location.suburbName}? Locations with schedules cannot be deleted.`)) return;
    const accessToken = requireAccessToken();
    if (!accessToken) return;
    setError("");
    try {
      const response = await fetch(`${API}/admin/locations/${location.zoneBlockId}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("powertrack_token");
        router.replace("/admin/login");
        setError("Authentication required. Please sign in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete location.");
      if (selectedLocation?.zoneBlockId === location.zoneBlockId) {
        setSelectedLocation(null);
        setEditingLocation(null);
        setForm(emptyForm);
      }
      setNotice("Location deleted successfully.");
      await loadLocations(filter);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete location.");
    }
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API}/location/reverse?lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not identify this map location.");
      chooseFeature(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not identify this map location.");
    }
  }

  function mapSelect(id: string) {
    const location = locations.find((item) => item.zoneBlockId === id);
    if (location) selectSavedLocation(location);
  }

  function createSchedule() {
    if (!selectedLocation) return;
    router.push(`/admin/schedules?zoneBlockId=${encodeURIComponent(selectedLocation.zoneBlockId)}`);
  }

  function signOut() {
    localStorage.removeItem("powertrack_token");
    router.replace("/admin/login");
  }

  const focusId = selectedFeature ? `osm:${selectedFeature.osmType || "place"}/${selectedFeature.osmId || selectedFeature.geocoderPlaceId || "selected"}` : selectedLocation?.zoneBlockId || "";

  return <main className="app-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><nav className="admin-nav"><Link className="nav" href="/admin/dashboard">Dashboard</Link><Link className="nav" href="/admin/schedules">Schedules</Link><button className="nav" onClick={signOut}>Sign out</button></nav></header>
    <section className="geo-admin"><div className="eyebrow">Canonical location database</div><h1>Map the places.</h1><p className="intro">Verified PowerTrack locations are stored once and shared by administrators and the public.</p>
      {error && <div className="card error geo-message" role="alert">{error}</div>}{notice && <div className="geo-notice" role="status">{notice}</div>}
      <div className="geo-grid"><div className="geo-main"><form className="geo-search" onSubmit={searchMap}><label htmlFor="map-place-search">Find a South African place</label><div className="geo-search-row"><input id="map-place-search" value={mapQuery} onChange={(event) => setMapQuery(event.target.value)} placeholder="Search by address or place name" /><button className="button" disabled={searching}>{searching ? "Searching..." : "Search address"}</button></div></form>
          {mapResults.length > 0 && <div className="geo-results" aria-label="Address search results">{mapResults.map((feature) => <button type="button" className="geo-result" key={`${feature.osmType}-${feature.osmId}-${feature.geocoderPlaceId}`} onClick={() => chooseFeature(feature)}><strong>{feature.displayName}</strong><span>{[feature.address.suburb, feature.address.area, feature.address.city || feature.address.town, feature.address.municipality, feature.address.province].filter(Boolean).join(", ")}</span></button>)}</div>}
          <div className="geo-map-frame"><LocationMap points={points} focusId={focusId} selectedPoint={selectedFeature ? { latitude: selectedFeature.latitude, longitude: selectedFeature.longitude } : null} onSelect={mapSelect} onMapClick={(latitude, longitude) => void reverseGeocode(latitude, longitude)} onMarkerMoved={(latitude, longitude) => void reverseGeocode(latitude, longitude)} /></div><div className="map-attribution">© OpenStreetMap contributors</div>
          <div className="locations-toolbar"><h2 className="section-title">PowerTrack locations</h2><input aria-label="Filter PowerTrack locations" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter saved locations" /></div>
          <div className="geo-location-list" aria-live="polite">{loading ? <p className="muted">Loading saved locations...</p> : locations.length === 0 ? <p className="muted">No saved locations match. Search a South African place above to add one.</p> : locations.map((location) => <article className={`geo-location-row ${selectedLocation?.zoneBlockId === location.zoneBlockId ? "is-selected" : ""}`} key={location.zoneBlockId}><button type="button" className="geo-location-select" onClick={() => selectSavedLocation(location)}><strong>{location.zoneBlockName}</strong><span>{location.suburbName} · {location.areaName} · {location.cityName} · {location.provinceName}</span></button><button type="button" className="saved-open" onClick={() => { selectSavedLocation(location); router.push(`/admin/schedules?zoneBlockId=${encodeURIComponent(location.zoneBlockId)}`); }}>Create schedule</button></article>)}</div>
        </div>
        <aside className="geo-detail"><div className="status-label">Location hierarchy</div><h2 className="section-title">{selectedFeature ? selectedFeature.displayName : selectedLocation ? selectedLocation.zoneBlockName : "Select a place"}</h2>
          {selectedFeature && <p className="muted geo-coordinates">OpenStreetMap · {selectedFeature.latitude.toFixed(5)}, {selectedFeature.longitude.toFixed(5)}</p>}
          {selectedLocation && selectedLocation.latitude !== null && selectedLocation.longitude !== null && <p className="muted geo-coordinates">{selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}</p>}
          <form className="admin-form geo-form" onSubmit={saveLocation}>
            {(["province", "city", "area", "suburb", "zoneBlock"] as const).map((key) => <label key={key}>{key === "city" ? "City / Municipality" : key === "zoneBlock" ? "Zone / Block" : key}<input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} disabled={!selectedFeature && !selectedLocation} required /></label>)}
            {selectedLocation && <div className="geo-hierarchy-readout">{selectedLocation.zoneBlockName}<br />{selectedLocation.suburbName} → {selectedLocation.areaName} → {selectedLocation.cityName} → {selectedLocation.provinceName}</div>}
            {editingLocation && selectedFeature && <p className="muted">This OpenStreetMap place will be applied to the selected existing Zone/Block.</p>}
            <button className="button admin-button" type="submit" disabled={saving || (!selectedFeature && !selectedLocation)}>{saving ? "Saving..." : editingLocation ? "Update location" : selectedFeature ? "Create location" : "Save changes"}</button>
          </form>
          {selectedLocation && <div className="geo-detail-actions"><button className="button" type="button" onClick={createSchedule}>Create schedule</button><button className="danger-button" type="button" onClick={() => void deleteLocation(selectedLocation)}>Delete zone/block</button></div>}
          <p className="muted geo-policy">All location changes are stored in the PowerTrack database. Public users can search these records but cannot change them.</p>
        </aside></div>
    </section>
  </main>;
}
