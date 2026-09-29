"""
Impact and loss analysis service.

PRELIMINARY DEMONSTRATION ESTIMATE — NOT for operational use.
Overlays flood extent with synthetic infrastructure data to
estimate exposure and impact categories.
"""
import json
import math
from typing import Dict, Any, List


class ImpactAnalyzer:
    """
    Simplified impact analyzer for HADR demonstration.

    DISCLAIMER:
    All impact estimates are PRELIMINARY DEMONSTRATION ESTIMATES
    based on synthetic data. Do not use for real emergency decisions.
    """

    # Depth-based impact categories
    IMPACT_THRESHOLDS = {
        "LOW": (0.1, 0.3),
        "MODERATE": (0.3, 1.0),
        "HIGH": (1.0, 2.0),
        "VERY_HIGH": (2.0, float("inf")),
    }

    def analyze_impact(
        self,
        flood_extent_geojson: Dict,
        demo_data: Dict,
        flood_stats: Dict,
        model_name: str,
    ) -> Dict[str, Any]:
        """
        Analyze flood impact using flood extent and infrastructure data.

        Returns impact summary with all required HADR metrics.
        """
        settlements = demo_data.get("settlements", {}).get("features", [])
        roads = demo_data.get("roads", {}).get("features", [])
        infrastructure = demo_data.get("infrastructure", {}).get("features", [])
        agriculture = demo_data.get("agriculture", {}).get("features", [])

        max_depth = flood_stats.get("max_depth_m", 0.0)
        inundation_area_km2 = flood_stats.get("inundation_area_km2", 0.0)

        # Simplification: if max depth > threshold, asset is "affected"
        # Real implementation would do spatial intersection

        # Settlements / villages
        affected_villages = 0
        affected_population = 0
        for feat in settlements:
            pop = feat.get("properties", {}).get("population", 0)
            name = feat.get("properties", {}).get("name", "")
            # Assume villages in the flood extent are affected if > 0.5m depth
            if max_depth > 0.5:
                affected_villages += 1
                affected_population += pop

        # Roads: assume fraction based on inundation
        total_road_features = len(roads)
        affected_roads_fraction = min(1.0, inundation_area_km2 / 50.0)
        affected_roads_km = round(total_road_features * 15.0 * affected_roads_fraction, 1)

        # Bridges
        bridges = [f for f in infrastructure if f.get("properties", {}).get("type") == "Bridge"]
        affected_bridges = int(len(bridges) * affected_roads_fraction)

        # Buildings (synthetic: ~200 buildings in study area)
        total_buildings = 200
        affected_buildings = int(total_buildings * min(0.85, affected_roads_fraction * 1.2))

        # Agriculture
        agri_areas = agriculture
        total_agri_ha = sum(
            self._polygon_area_ha(f.get("geometry", {}).get("coordinates", []))
            for f in agri_areas
        )
        if total_agri_ha < 100:
            total_agri_ha = 450.0  # default synthetic agricultural area
        affected_agriculture_ha = round(total_agri_ha * min(0.9, affected_roads_fraction * 1.3), 1)

        # Critical infrastructure
        affected_infrastructure = int(len(infrastructure) * affected_roads_fraction)

        # Depth-based damage categories
        impact_categories = self._categorize_by_depth(max_depth, inundation_area_km2)

        return {
            "model": model_name,
            "is_mock": True,
            "is_preliminary": True,
            "disclaimer": (
                "PRELIMINARY DEMONSTRATION ESTIMATE — "
                "Based on synthetic data and simplified exposure analysis. "
                "NOT for real-world emergency or engineering decisions."
            ),
            "affected_population": affected_population,
            "affected_villages": affected_villages,
            "affected_buildings": affected_buildings,
            "affected_roads_km": affected_roads_km,
            "affected_bridges": affected_bridges,
            "affected_agriculture_ha": affected_agriculture_ha,
            "affected_infrastructure": affected_infrastructure,
            "impact_categories": impact_categories,
            "flood_area_km2": inundation_area_km2,
            "max_depth_m": max_depth,
        }

    def _categorize_by_depth(self, max_depth: float, area_km2: float) -> Dict:
        """Assign impact severity categories based on flood depth."""
        categories = {}
        for category, (d_min, d_max) in self.IMPACT_THRESHOLDS.items():
            if max_depth >= d_min:
                if max_depth < d_max or d_max == float("inf"):
                    severity_fraction = min(1.0, (max_depth - d_min) / max(d_max - d_min, 1))
                    categories[category] = {
                        "applicable": True,
                        "area_fraction": round(severity_fraction, 2),
                        "estimated_area_km2": round(area_km2 * severity_fraction * 0.6, 2),
                    }
                else:
                    categories[category] = {"applicable": False}
            else:
                categories[category] = {"applicable": False}
        return categories

    def _polygon_area_ha(self, coordinates: List) -> float:
        """Approximate polygon area in hectares using shoelace formula."""
        if not coordinates or not coordinates[0]:
            return 0.0
        ring = coordinates[0]
        if len(ring) < 3:
            return 0.0
        n = len(ring)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += ring[i][0] * ring[j][1]
            area -= ring[j][0] * ring[i][1]
        area_deg2 = abs(area) / 2.0
        # Convert deg² to km² at ~30°N: 1° lat ≈ 111km, 1° lon ≈ 96km
        area_km2 = area_deg2 * 111.0 * 96.0
        return area_km2 * 100.0  # km² to ha

    def categorize_impact(self, depth_m: float) -> str:
        """Return impact category string for a given flood depth."""
        for category, (d_min, d_max) in self.IMPACT_THRESHOLDS.items():
            if d_min <= depth_m < d_max:
                return category
        return "NONE"
