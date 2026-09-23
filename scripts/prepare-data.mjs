import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawPath = path.join(projectRoot, 'data', 'raw', 'abandoned_vehicles_2025.csv');
const zipPath = path.join(projectRoot, 'data', 'raw', 'philadelphia_zipcodes.geojson');
const pointOutputPath = path.join(projectRoot, 'data', 'processed', 'abandoned_vehicle_points.geojson');
const zipOutputPath = path.join(projectRoot, 'data', 'processed', 'zip_metrics.geojson');
const comparisonOutputPath = path.join(projectRoot, 'data', 'processed', 'comparison_features.geojson');
const snapshot = new Date('2026-09-12T23:59:59Z');

const parseCsv = (text) => {
  const records = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    const next = text[i + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) records.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    records.push(row);
  }

  const [headers, ...values] = records;
  headers[0] = headers[0].replace(/^\uFEFF/, '');
  return values.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] || ''])));
};

const dateOnly = (value) => value ? value.slice(0, 10) : null;
const round = (value, digits = 4) => (
  value === null || value === undefined ? null : Number(value.toFixed(digits))
);
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const rows = parseCsv(fs.readFileSync(rawPath, 'utf8'));
const zipBoundaries = JSON.parse(fs.readFileSync(zipPath, 'utf8'));
const groups = new Map();
let missedTotal = 0;

const points = rows.flatMap((row) => {
  const requested = new Date(row.requested_datetime);
  const closed = row.closed_datetime ? new Date(row.closed_datetime) : null;
  const expected = row.expected_datetime ? new Date(row.expected_datetime) : null;
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  const daysToClose = closed ? (closed - requested) / 86400000 : null;
  const closedByExpected = Boolean(closed && expected && closed <= expected);
  const missedExpected = Boolean(expected && ((closed && closed > expected) || (!closed && snapshot > expected)));
  if (missedExpected) missedTotal += 1;
  const zip = row.zipcode;

  if (zip) {
    if (!groups.has(zip)) groups.set(zip, []);
    groups.get(zip).push({ closed, expected, daysToClose, closedByExpected, missedExpected });
  }

  if (!row.lat || !row.lon || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  return [{
    type: 'Feature',
    properties: {
      id: row.service_request_id,
      status: row.status,
      zipcode: zip,
      requested_date: dateOnly(row.requested_datetime),
      closed_date: dateOnly(row.closed_datetime),
      expected_date: dateOnly(row.expected_datetime),
      days_to_close: daysToClose === null ? null : round(daysToClose, 1),
      closed_within_180_days: daysToClose !== null && daysToClose <= 180,
      closed_by_expected: closedByExpected,
      missed_expected: missedExpected,
    },
    geometry: { type: 'Point', coordinates: [lon, lat] },
  }];
});

const zipcodeForFeature = (feature) => String(
  feature.properties.CODE
  || feature.properties.ZIPCODE
  || feature.properties.zipcode
  || feature.properties.ZIP_CODE
  || '',
);

const zipFeatures = zipBoundaries.features.map((feature) => {
  const zipcode = zipcodeForFeature(feature);
  const cases = groups.get(zipcode) || [];
  if (!cases.length) {
    return { ...feature, properties: { zipcode } };
  }

  const closedCases = cases.filter((item) => item.closed);
  const expectedCases = cases.filter((item) => item.expected);
  const closedWithin180 = cases.filter((item) => item.daysToClose !== null && item.daysToClose <= 180).length;
  const onTime = cases.filter((item) => item.closedByExpected).length;
  const missedExpected = cases.filter((item) => item.missedExpected).length;

  return {
    ...feature,
    properties: {
      zipcode,
      total_requests: cases.length,
      closed_requests: closedCases.length,
      open_requests: cases.length - closedCases.length,
      open_share: round((cases.length - closedCases.length) / cases.length),
      closed_within_180: closedWithin180,
      closed_within_180_share: round(closedWithin180 / cases.length),
      median_close_days: round(median(closedCases.map((item) => item.daysToClose)), 1),
      expected_date_requests: expectedCases.length,
      closed_by_expected: onTime,
      on_time_share: round(onTime / expectedCases.length),
      missed_expected: missedExpected,
      missed_expected_share: round(missedExpected / expectedCases.length),
    },
  };
});

const pointCollection = {
  type: 'FeatureCollection',
  bbox: [-75.2803, 39.8670, -74.9558, 40.1379],
  features: points,
};

const zipCollection = {
  type: 'FeatureCollection',
  bbox: [-75.2803, 39.8670, -74.9558, 40.1379],
  features: zipFeatures,
};

const comparisonZipcodes = new Set(['19128', '19131']);
const comparisonCollection = {
  type: 'FeatureCollection',
  bbox: [-75.29, 39.95, -75.08, 40.10],
  features: [
    ...zipFeatures
      .filter((feature) => comparisonZipcodes.has(feature.properties.zipcode))
      .map((feature) => ({
        ...feature,
        properties: { ...feature.properties, feature_kind: 'boundary' },
      })),
    ...points
      .filter((feature) => comparisonZipcodes.has(feature.properties.zipcode))
      .map((feature) => ({
        ...feature,
        properties: { ...feature.properties, feature_kind: 'request' },
      })),
  ],
};

fs.writeFileSync(pointOutputPath, `${JSON.stringify(pointCollection)}\n`);
fs.writeFileSync(zipOutputPath, `${JSON.stringify(zipCollection)}\n`);
fs.writeFileSync(comparisonOutputPath, `${JSON.stringify(comparisonCollection)}\n`);

const expectedTotal = rows.filter((row) => row.expected_datetime).length;
console.log(`Prepared ${points.length.toLocaleString()} points and ${zipFeatures.length} ZIP boundaries.`);
console.log(`Prepared ${comparisonCollection.features.length.toLocaleString()} comparison features.`);
console.log(`${missedTotal.toLocaleString()} of ${expectedTotal.toLocaleString()} requests missed their expected date.`);
