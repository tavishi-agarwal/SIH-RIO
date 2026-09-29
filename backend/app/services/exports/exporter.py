"""
GIS Export service — generates SHP, KML, GeoJSON, GeoTIFF, CSV.
"""
import os
import json
import csv
import zipfile
from typing import Dict, Any, List, Optional


class GISExporter:
    """
    Exports flood simulation results to standard GIS formats.
    
    Supported formats: GeoJSON, KML, SHP (via geopandas), GeoTIFF, CSV
    Falls back gracefully when optional dependencies (geopandas) are unavailable.
    """

    def export_all_formats(
        self,
        simulation_id: str,
        sph_result: Dict,
        d3d_result: Dict,
        output_base_dir: str,
    ) -> Dict[str, Any]:
        """Export all results in all formats."""
        os.makedirs(output_base_dir, exist_ok=True)
        exports = {}

        for model_name, result in [("sph", sph_result), ("delft3d", d3d_result)]:
            model_dir = os.path.join(output_base_dir, model_name)
            os.makedirs(model_dir, exist_ok=True)
            exports[model_name] = {}

            # GeoJSON
            flood_extent_src = result.get("file_paths", {}).get("flood_extent", "")
            if flood_extent_src and os.path.exists(flood_extent_src):
                dst_geojson = os.path.join(model_dir, "flood_extent.geojson")
                self._copy_file(flood_extent_src, dst_geojson)
                exports[model_name]["flood_extent_geojson"] = dst_geojson

                # KML from GeoJSON
                dst_kml = os.path.join(model_dir, "flood_extent.kml")
                self._geojson_to_kml(flood_extent_src, dst_kml, simulation_id, model_name.upper())
                exports[model_name]["flood_extent_kml"] = dst_kml

                # SHP (try geopandas)
                dst_shp = os.path.join(model_dir, "flood_extent.shp")
                shp_result = self._geojson_to_shapefile(flood_extent_src, dst_shp)
                if shp_result:
                    exports[model_name]["flood_extent_shp"] = dst_shp

            # GeoTIFF — copy from output
            for layer in ["flood_depth", "velocity", "arrival_time", "water_surface"]:
                src_tif = result.get("file_paths", {}).get(layer, "")
                if src_tif and os.path.exists(src_tif):
                    dst_tif = os.path.join(model_dir, f"{layer}.tif")
                    self._copy_file(src_tif, dst_tif)
                    exports[model_name][f"{layer}_tif"] = dst_tif

            # Discharge CSV
            src_csv = result.get("file_paths", {}).get("discharge", "")
            if src_csv and os.path.exists(src_csv):
                dst_csv = os.path.join(model_dir, "discharge.csv")
                self._copy_file(src_csv, dst_csv)
                exports[model_name]["discharge_csv"] = dst_csv

            # Impact summary CSV
            impact_csv = os.path.join(model_dir, "impact_summary.csv")
            self._write_impact_csv(result, model_name.upper(), impact_csv)
            exports[model_name]["impact_csv"] = impact_csv

            # Create ZIP of all exports
            zip_path = os.path.join(model_dir, f"hadr_flood_export_{model_name}.zip")
            self._create_zip(model_dir, zip_path)
            exports[model_name]["zip"] = zip_path

        return exports

    def _geojson_to_kml(
        self, geojson_path: str, output_path: str,
        simulation_id: str, model_name: str
    ):
        """Convert GeoJSON to KML format."""
        try:
            with open(geojson_path) as f:
                geojson = json.load(f)

            features = geojson.get("features", [])
            placemarks = ""
            for feat in features:
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                depth_class = props.get("depth_class", "")
                color = props.get("color", "#FFB300")
                kml_color = self._hex_to_kml_color(color, alpha=150)

                if geom.get("type") == "Polygon":
                    coords = geom["coordinates"][0]
                    coord_str = " ".join(f"{c[0]},{c[1]},0" for c in coords)
                    placemarks += f"""
  <Placemark>
    <name>{depth_class} — {model_name}</name>
    <description>
      Depth class: {depth_class}
      Model: MOCK {model_name}
      MOCK {model_name} — DEMONSTRATION ONLY
    </description>
    <Style>
      <PolyStyle>
        <color>{kml_color}</color>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Polygon>
      <outerBoundaryIs>
        <LinearRing>
          <coordinates>{coord_str}</coordinates>
        </LinearRing>
      </outerBoundaryIs>
    </Polygon>
  </Placemark>"""

            kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>HADR Flood Simulation — {model_name} — {simulation_id[:8]}</name>
  <description>
    MOCK {model_name} — DEMONSTRATION ONLY.
    Not a real simulation result.
  </description>
{placemarks}
</Document>
</kml>"""

            with open(output_path, "w") as f:
                f.write(kml_content)
        except Exception as e:
            # Write minimal valid KML on error
            with open(output_path, "w") as f:
                f.write('<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document></Document></kml>')

    def _geojson_to_shapefile(self, geojson_path: str, output_path: str) -> bool:
        """Convert GeoJSON to Shapefile using geopandas."""
        try:
            import geopandas as gpd
            gdf = gpd.read_file(geojson_path)
            if len(gdf) > 0:
                gdf.to_file(output_path, driver="ESRI Shapefile")
                return True
        except Exception:
            pass
        return False

    def _write_impact_csv(self, result: Dict, model_name: str, output_path: str):
        """Write flood statistics to CSV."""
        rows = [
            ["Metric", "Value", "Unit", "Model", "Disclaimer"],
            ["Max Flood Depth", result.get("max_depth_m", 0), "m", f"MOCK {model_name}", "DEMO"],
            ["Avg Flood Depth", result.get("avg_depth_m", 0), "m", f"MOCK {model_name}", "DEMO"],
            ["Max Velocity", result.get("max_velocity_ms", 0), "m/s", f"MOCK {model_name}", "DEMO"],
            ["Inundation Area", result.get("inundation_area_km2", 0), "km²", f"MOCK {model_name}", "DEMO"],
            ["Peak Discharge", result.get("peak_discharge_m3s", 0), "m³/s", f"MOCK {model_name}", "DEMO"],
            ["First Arrival Time", result.get("arrival_time_hrs", 0), "hrs", f"MOCK {model_name}", "DEMO"],
        ]
        with open(output_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerows(rows)

    def _hex_to_kml_color(self, hex_color: str, alpha: int = 200) -> str:
        """Convert #RRGGBB to KML aabbggrr format."""
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 6:
            r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
            return f"{alpha:02x}{b}{g}{r}"
        return "96ffffff"

    def _copy_file(self, src: str, dst: str):
        """Copy file, creating parent directories."""
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            import shutil
            shutil.copy2(src, dst)
        except Exception:
            pass

    def _create_zip(self, source_dir: str, zip_path: str):
        """Create ZIP archive of all files in source_dir."""
        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for fname in os.listdir(source_dir):
                    fpath = os.path.join(source_dir, fname)
                    if os.path.isfile(fpath) and not fname.endswith(".zip"):
                        zf.write(fpath, fname)
        except Exception:
            pass

    def export_geojson(self, data: Dict, output_path: str):
        """Export GeoJSON file."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(data, f, indent=2)

    def export_kml(self, geojson_data: Dict, output_path: str):
        """Convert and export KML."""
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False, mode="w") as tmp:
            json.dump(geojson_data, tmp)
            tmp_path = tmp.name
        self._geojson_to_kml(tmp_path, output_path, "export", "RESULT")
        os.unlink(tmp_path)

    def export_csv(self, data: List[Dict], output_path: str):
        """Export list of dicts as CSV."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        if not data:
            return
        with open(output_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(data[0].keys()))
            writer.writeheader()
            writer.writerows(data)
