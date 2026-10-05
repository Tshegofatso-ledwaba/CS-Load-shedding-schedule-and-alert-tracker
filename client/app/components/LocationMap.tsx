"use client";

import { useEffect, useRef } from "react";
import { AttributionControl, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";

export type MapPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  kind: "saved" | "selected";
};

type LocationMapProps = {
  points: MapPoint[];
  focusId: string;
  onSelect: (id: string) => void;
  onMapClick: (latitude: number, longitude: number) => void;
  selectedPoint?: { latitude: number; longitude: number } | null;
  onMarkerMoved?: (latitude: number, longitude: number) => void;
};

const osmStyle = {
  version: 8 as const,
  sources: {
    openstreetmap: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "openstreetmap", type: "raster" as const, source: "openstreetmap" }],
};

export default function LocationMap({ points, focusId, onSelect, onMapClick, selectedPoint = null, onMarkerMoved }: LocationMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const pointsRef = useRef(points);
  const onSelectRef = useRef(onSelect);
  const onMapClickRef = useRef(onMapClick);
  const onMarkerMovedRef = useRef(onMarkerMoved);

  useEffect(() => {
    pointsRef.current = points;
    onSelectRef.current = onSelect;
    onMapClickRef.current = onMapClick;
    onMarkerMovedRef.current = onMarkerMoved;
  }, [points, onSelect, onMapClick, onMarkerMoved]);

  useEffect(() => {
    if (!container.current || map.current) return;
    setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
    const instance = new MapLibreMap({
      container: container.current,
      style: osmStyle,
      center: [24, -29],
      zoom: 4.2,
      cooperativeGestures: true,
    });
    instance.addControl(new NavigationControl(), "top-right");
    instance.addControl(new AttributionControl({ compact: true, customAttribution: "© OpenStreetMap contributors" }), "bottom-right");
    instance.on("load", () => {
      const data = {
        type: "FeatureCollection" as const,
        features: pointsRef.current.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)).map((point) => ({
          type: "Feature" as const,
          id: point.id,
          geometry: { type: "Point" as const, coordinates: [point.longitude, point.latitude] },
          properties: { id: point.id, label: point.label, kind: point.kind },
        })),
      };
      instance.addSource("powertrack-points", { type: "geojson", data });
      instance.addLayer({
        id: "powertrack-points",
        type: "circle",
        source: "powertrack-points",
        paint: {
          "circle-radius": ["case", ["==", ["get", "kind"], "selected"], 9, 6],
          "circle-color": ["case", ["==", ["get", "kind"], "selected"], "#ff8a43", "#16a085"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      instance.on("click", "powertrack-points", (event) => {
        const feature = event.features?.[0] as { properties?: { id?: unknown } } | undefined;
        const id = feature?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      instance.on("click", (event) => {
        const hit = instance.queryRenderedFeatures(event.point, { layers: ["powertrack-points"] });
        if (!hit.length) onMapClickRef.current(event.lngLat.lat, event.lngLat.lng);
      });
      instance.on("mouseenter", "powertrack-points", () => { instance.getCanvas().style.cursor = "pointer"; });
      instance.on("mouseleave", "powertrack-points", () => { instance.getCanvas().style.cursor = ""; });
    });
    map.current = instance;
    return () => {
      marker.current?.remove();
      marker.current = null;
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const source = instance?.getSource("powertrack-points") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)).map((point) => ({
        type: "Feature",
        id: point.id,
        geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
        properties: { id: point.id, label: point.label, kind: point.kind },
      })),
    });
  }, [points]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const focused = points.find((item) => item.id === focusId);
    if (selectedPoint && Number.isFinite(selectedPoint.latitude) && Number.isFinite(selectedPoint.longitude)) {
      if (!marker.current) {
        marker.current = new Marker({ color: "#ff8a43", draggable: true })
          .setLngLat([selectedPoint.longitude, selectedPoint.latitude])
          .addTo(instance);
        marker.current.on("dragend", () => {
          const position = marker.current?.getLngLat();
          if (position) onMarkerMovedRef.current?.(position.lat, position.lng);
        });
      } else {
        marker.current.setLngLat([selectedPoint.longitude, selectedPoint.latitude]);
      }
      instance.flyTo({ center: [selectedPoint.longitude, selectedPoint.latitude], zoom: 16 });
      return;
    }
    marker.current?.remove();
    marker.current = null;
    if (focused) instance.flyTo({ center: [focused.longitude, focused.latitude], zoom: 12 });
  }, [focusId, points, selectedPoint]);

  return <div ref={container} className="powertrack-map" role="application" aria-label="OpenStreetMap of PowerTrack locations" />;
}
