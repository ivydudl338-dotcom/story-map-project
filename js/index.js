import { SlideDeck } from './slidedeck.js';

const map = L.map('map', {
  scrollWheelZoom: false,
  zoomControl: true,
}).setView([39.99, -75.15], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

const container = document.querySelector('.slide-section');
const slides = document.querySelectorAll('.slide');

const noDataStyle = {
  color: '#ffffff',
  fillColor: '#c8cfcc',
  fillOpacity: 0.65,
  weight: 1,
};

const baseStyle = (fillColor = '#c8d8d4') => ({
  color: '#ffffff',
  fillColor,
  fillOpacity: 0.8,
  weight: 1.2,
});

const colorFromBreaks = (value, breaks, colors) => {
  if (value === undefined || value === null) return '#c8cfcc';
  const index = breaks.findIndex((breakpoint) => value < breakpoint);
  return colors[index === -1 ? colors.length - 1 : index];
};

const volumeColor = (value) => colorFromBreaks(
  value,
  [250, 500, 750, 1000],
  ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
);

const openColor = (value) => colorFromBreaks(
  value,
  [0.35, 0.5, 0.65, 0.75],
  ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
);

const closedColor = (value) => colorFromBreaks(
  value,
  [0.15, 0.25, 0.35, 0.45],
  ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
);

const formatPercent = (value) => (
  value === undefined || value === null ? 'No data' : `${Math.round(value * 100)}%`
);

const tooltipContent = (properties) => {
  if (properties.total_requests === undefined) {
    return `<div class="zip-tooltip"><strong>ZIP ${properties.zipcode}</strong>No 2025 requests</div>`;
  }
  return `<div class="zip-tooltip">
    <strong>ZIP ${properties.zipcode}</strong>
    ${properties.total_requests.toLocaleString()} requests<br>
    ${formatPercent(properties.open_share)} still open<br>
    ${formatPercent(properties.closed_within_180_share)} closed within 180 days
  </div>`;
};

const bindTooltip = (feature, layer) => {
  layer.bindTooltip(tooltipContent(feature.properties), { sticky: true });
  layer.on({
    mouseover: () => layer.setStyle({ weight: 3, color: '#172321' }),
    mouseout: () => layer.setStyle({ weight: 1.2, color: '#ffffff' }),
  });
};

const slideOptions = {
  'title-slide': {
    view: { center: [39.98, -75.16], zoom: 10 },
    style: () => baseStyle('#9fb9b2'),
    onEachFeature: bindTooltip,
  },
  'request-volume': {
    view: { center: [39.99, -75.16], zoom: 11 },
    style: (feature) => {
      const value = feature.properties.total_requests;
      return value === undefined ? noDataStyle : baseStyle(volumeColor(value));
    },
    onEachFeature: bindTooltip,
  },
  'open-backlog': {
    view: { center: [39.99, -75.16], zoom: 11 },
    style: (feature) => {
      const value = feature.properties.open_share;
      return value === undefined ? noDataStyle : baseStyle(openColor(value));
    },
    onEachFeature: bindTooltip,
  },
  'six-month-outcomes': {
    view: { center: [39.99, -75.16], zoom: 11 },
    style: (feature) => {
      const value = feature.properties.closed_within_180_share;
      return value === undefined ? noDataStyle : baseStyle(closedColor(value));
    },
    onEachFeature: bindTooltip,
  },
  'neighborhood-contrast': {
    view: {
      bounds: [
        [39.967, -75.265],
        [40.084, -75.191],
      ],
    },
    style: (feature) => {
      const zipcode = feature.properties.zipcode;
      if (zipcode === '19128') return baseStyle('#137c78');
      if (zipcode === '19131') return baseStyle('#8c2d67');
      return { ...baseStyle('#d8dddb'), fillOpacity: 0.45 };
    },
    onEachFeature: bindTooltip,
  },
  conclusion: {
    view: {
      bounds: [
        [39.967, -75.265],
        [40.084, -75.191],
      ],
    },
    style: () => baseStyle('#9fb9b2'),
    onEachFeature: bindTooltip,
  },
};

const deck = new SlideDeck(container, slides, map, slideOptions);

document.addEventListener('scroll', () => deck.calcCurrentSlideIndex(), { passive: true });

deck.preloadFeatureCollections();
deck.syncMapToCurrentSlide();
