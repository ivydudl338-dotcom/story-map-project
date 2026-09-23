import { SlideDeck } from './slidedeck.js';

const cityView = { center: [39.99, -75.16], zoom: 11 };
const pointRenderer = L.canvas({ padding: 0.5 });
const map = L.map('map', {
  scrollWheelZoom: false,
  zoomControl: true,
  preferCanvas: true,
}).setView([39.98, -75.16], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const container = document.querySelector('.slide-section');
const slides = document.querySelectorAll('.slide');

const palette = {
  paper: '#e6e0d2',
  rust: '#c85a32',
  warning: '#d0a84b',
  closed: '#647b70',
  cyan: '#78a99e',
  noData: '#303530',
};

const noDataStyle = {
  color: '#575d57',
  fillColor: palette.noData,
  fillOpacity: 0.72,
  weight: 0.8,
};

const baseStyle = (fillColor = '#4c5a53') => ({
  color: '#b4b6ad',
  fillColor,
  fillOpacity: 0.82,
  weight: 0.8,
});

const colorFromBreaks = (value, breaks, colors) => {
  if (value === undefined || value === null) return palette.noData;
  const index = breaks.findIndex((breakpoint) => value < breakpoint);
  return colors[index === -1 ? colors.length - 1 : index];
};

const volumeColor = (value) => colorFromBreaks(
  value,
  [250, 500, 750, 1000],
  ['#403a32', '#66503b', '#926344', '#bd653d', '#e16a3d'],
);

const overdueColor = (value) => colorFromBreaks(
  value,
  [0.35, 0.5, 0.65, 0.75],
  ['#3f443e', '#6e6848', '#9a8245', '#c19b43', '#e1b950'],
);

const closedColor = (value) => colorFromBreaks(
  value,
  [0.15, 0.25, 0.35, 0.45],
  ['#343d39', '#42534d', '#536a62', '#67857a', '#81a899'],
);

const formatPercent = (value, digits = 0) => (
  value === undefined || value === null ? 'No data' : `${(value * 100).toFixed(digits)}%`
);

const tooltipContent = (properties) => {
  if (properties.total_requests === undefined) {
    return `<div class="zip-tooltip"><strong>ZIP ${properties.zipcode}</strong>No 2025 requests</div>`;
  }
  return `<div class="zip-tooltip">
    <strong>ZIP ${properties.zipcode}</strong>
    ${properties.total_requests.toLocaleString()} requests<br>
    ${formatPercent(properties.open_share)} still open<br>
    ${formatPercent(properties.closed_within_180_share)} closed within 180 days<br>
    ${formatPercent(properties.on_time_share)} closed by expected date
  </div>`;
};

const bindTooltip = (feature, layer) => {
  const originalStyle = { ...layer.options };
  layer.bindTooltip(tooltipContent(feature.properties), { sticky: true });
  layer.on({
    mouseover: () => layer.setStyle({ weight: 2.5, color: palette.paper }),
    mouseout: () => layer.setStyle(originalStyle),
  });
};

const pointOptionsForDate = (cutoff) => ({
  view: cityView,
  renderer: pointRenderer,
  filter: (feature) => feature.properties.requested_date <= cutoff,
  pointToLayer: (feature, latlng) => {
    const closedDate = feature.properties.closed_date;
    const resolved = closedDate && closedDate <= cutoff;
    return L.circleMarker(latlng, {
      renderer: pointRenderer,
      radius: resolved ? 1.2 : 1.65,
      stroke: false,
      fillColor: resolved ? palette.closed : palette.rust,
      fillOpacity: resolved ? 0.28 : 0.72,
    });
  },
});

const comparisonBounds = [[39.95, -75.29], [40.10, -75.08]];
const comparisonBoundaryStyle = (feature) => (
  feature.properties.feature_kind === 'boundary'
    ? {
        color: feature.properties.zipcode === '19128' ? palette.cyan : palette.rust,
        fillColor: '#171916',
        fillOpacity: 0.06,
        weight: 1.6,
      }
    : {}
);

const bindComparisonTooltip = (feature, layer) => {
  const properties = feature.properties;
  if (properties.feature_kind === 'boundary') {
    layer.bindTooltip(tooltipContent(properties), { sticky: true });
    return;
  }
  layer.bindTooltip(`<div class="zip-tooltip"><strong>ZIP ${properties.zipcode}</strong>Requested ${properties.requested_date}<br>${properties.status}</div>`, { sticky: true });
};

const comparisonOptions = (pointStyle) => ({
  view: { bounds: comparisonBounds },
  style: comparisonBoundaryStyle,
  pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
    renderer: pointRenderer,
    stroke: false,
    ...pointStyle(feature.properties),
  }),
  onEachFeature: bindComparisonTooltip,
});

const metricStyle = (property, breaks, colors) => (feature) => {
  const value = feature.properties[property];
  return value === undefined ? noDataStyle : baseStyle(colorFromBreaks(value, breaks, colors));
};

const slideOptions = {
  'title-slide': {
    view: { center: [39.98, -75.16], zoom: 10 },
    style: () => ({ ...baseStyle('#3b4641'), fillOpacity: 0.45 }),
    onEachFeature: bindTooltip,
  },
  'requests-january': pointOptionsForDate('2025-01-31'),
  'requests-april': pointOptionsForDate('2025-04-30'),
  'requests-august': pointOptionsForDate('2025-08-31'),
  'requests-december': pointOptionsForDate('2025-12-31'),
  'request-volume': {
    view: cityView,
    style: (feature) => {
      const value = feature.properties.total_requests;
      return value === undefined ? noDataStyle : baseStyle(volumeColor(value));
    },
    onEachFeature: bindTooltip,
  },
  'open-backlog': {
    view: cityView,
    style: metricStyle(
      'open_share',
      [0.35, 0.5, 0.65, 0.75],
      ['#3f443e', '#6e6848', '#9a8245', '#c19b43', '#e1b950'],
    ),
    onEachFeature: bindTooltip,
  },
  'six-month-outcomes': {
    view: cityView,
    style: (feature) => {
      const value = feature.properties.closed_within_180_share;
      return value === undefined ? noDataStyle : baseStyle(closedColor(value));
    },
    onEachFeature: bindTooltip,
  },
  'expected-outcomes': {
    view: cityView,
    style: (feature) => {
      const value = feature.properties.missed_expected_share;
      return value === undefined ? noDataStyle : baseStyle(overdueColor(value));
    },
    onEachFeature: bindTooltip,
  },
  'volume-vs-outcome': {
    view: cityView,
    style: () => ({ ...baseStyle('#3f4944'), fillOpacity: 0.5 }),
    onEachFeature: bindTooltip,
  },
  'contrast-points': comparisonOptions((properties) => ({
    radius: 2.1,
    fillColor: properties.zipcode === '19128' ? palette.cyan : palette.rust,
    fillOpacity: 0.74,
  })),
  'contrast-open': comparisonOptions((properties) => {
    const isOpen = properties.status === 'Open';
    return {
      radius: isOpen ? 2.25 : 1.25,
      fillColor: isOpen ? palette.rust : palette.closed,
      fillOpacity: isOpen ? 0.82 : 0.2,
    };
  }),
  'contrast-expected': comparisonOptions((properties) => {
    const onTime = properties.closed_by_expected;
    return {
      radius: onTime ? 2.1 : 1.8,
      fillColor: onTime ? palette.warning : palette.rust,
      fillOpacity: onTime ? 0.9 : 0.62,
    };
  }),
  'neighborhood-contrast': comparisonOptions((properties) => ({
    radius: 1.8,
    fillColor: properties.zipcode === '19128' ? palette.cyan : palette.rust,
    fillOpacity: 0.6,
  })),
  'conclusion': comparisonOptions((properties) => ({
    radius: 1.3,
    fillColor: properties.zipcode === '19128' ? palette.cyan : palette.rust,
    fillOpacity: 0.28,
  })),
};

const renderScatter = (features) => {
  const data = features
    .map((feature) => feature.properties)
    .filter((item) => item.total_requests >= 100 && item.on_time_share !== null && item.on_time_share !== undefined);
  const width = 420;
  const height = 255;
  const margin = { top: 20, right: 18, bottom: 42, left: 45 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxRequests = Math.ceil(Math.max(...data.map((item) => item.total_requests)) / 500) * 500;
  const maxOnTime = Math.ceil(Math.max(...data.map((item) => item.on_time_share)) * 10) / 10;
  const x = (value) => margin.left + (value / maxRequests) * plotWidth;
  const y = (value) => margin.top + (1 - value / maxOnTime) * plotHeight;
  const gridValues = Array.from({ length: Math.round(maxOnTime * 10) + 1 }, (_, index) => index / 10);
  const xTicks = Array.from({ length: maxRequests / 500 + 1 }, (_, index) => index * 500);
  const points = data.map((item) => {
    const className = item.zipcode === '19128'
      ? 'highlight-fast'
      : item.zipcode === '19131' ? 'highlight-slow' : '';
    const label = className
      ? `<text x="${x(item.total_requests) + 7}" y="${y(item.on_time_share) - 7}">${item.zipcode}</text>`
      : '';
    return `<circle class="${className}" cx="${x(item.total_requests)}" cy="${y(item.on_time_share)}" r="${className ? 5 : 3}"><title>ZIP ${item.zipcode}: ${item.total_requests} requests; ${formatPercent(item.on_time_share, 1)} on time</title></circle>${label}`;
  }).join('');
  const grid = gridValues.map((value) => `<line class="grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y(value)}" y2="${y(value)}"></line><text x="${margin.left - 7}" y="${y(value) + 3}" text-anchor="end">${Math.round(value * 100)}%</text>`).join('');
  const xLabels = xTicks.map((value) => `<text x="${x(value)}" y="${height - margin.bottom + 15}" text-anchor="middle">${value.toLocaleString()}</text>`).join('');

  document.querySelector('#zip-scatter').innerHTML = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
    ${grid}
    <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>
    <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}"></line>
    ${xLabels}
    ${points}
    <text x="${width / 2}" y="${height - 10}" text-anchor="middle">TOTAL REQUESTS</text>
    <text transform="translate(11 ${height / 2}) rotate(-90)" text-anchor="middle">CLOSED BY EXPECTED DATE</text>
  </svg>`;

  ['19128', '19131'].forEach((zipcode) => {
    const record = data.find((item) => item.zipcode === zipcode);
    const target = document.querySelector(`[data-metric="${zipcode}-on-time"]`);
    if (record && target) target.textContent = `${formatPercent(record.on_time_share, 1)} closed on time`;
  });
};

fetch('data/processed/zip_metrics.geojson')
  .then((response) => response.json())
  .then((data) => renderScatter(data.features));

const deck = new SlideDeck(container, slides, map, slideOptions);

document.addEventListener('scroll', () => deck.calcCurrentSlideIndex(), { passive: true });
deck.preloadFeatureCollections();
deck.syncMapToCurrentSlide();
