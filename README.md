# The Geography of Waiting

An interactive story map examining Philadelphia 311 abandoned-vehicle requests submitted in 2025. It follows the accumulation of individual reports across the year, then asks whether the city's own expected completion dates were met evenly across ZIP Codes.

The story focuses on four measures:

- Total abandoned-vehicle requests
- Share of requests still listed as open
- Share of requests closed within 180 days
- Share of requests closed by their recorded expected date

The project uses the course scrollytelling template, Leaflet, a fixed citywide map for the main sequence, and a four-slide point-by-point comparison between ZIP Codes 19128 and 19131. Run `npm run prepare-data` to rebuild the processed GeoJSON files from the raw CSV and ZIP Code boundaries.

## Data and context sources

- [Philadelphia 311 Service and Information Requests](https://opendataphilly.org/datasets/311-service-and-information-requests/)
- [City of Philadelphia ZIP Code Boundaries](https://opendataphilly.org/datasets/zip-codes/)
- [City of Philadelphia: Report an abandoned vehicle](https://www.phila.gov/services/cars-parking-transportation/report-an-abandoned-vehicle/)
- [Opening archival photograph, U.S. National Archives](https://commons.wikimedia.org/wiki/File:ABANDONED_CAR_IN_TRASH-STREWN_LOT_-_NARA_-_552750.jpg)

The request dataset covers January 1 through December 31, 2025. Its latest record update was September 12, 2026. Of 27,987 requests, 27,938 have coordinates and appear as points; all requests contribute to the citywide totals and ZIP Code metrics. The opening photograph was made in Philadelphia in 1973 and is used only as historical context, not as evidence of conditions in 2025.

## Limitations

311 records represent reported and recorded problems, not every abandoned vehicle in Philadelphia. Multiple requests may refer to the same vehicle. A request marked “closed” does not necessarily mean that a vehicle was removed, and an “open” request does not prove that it remained at the reported location. The analysis describes geographic differences in administrative outcomes but cannot establish their causes.

## Development checks

Run `npm run lint` to lint the JavaScript and CSS. The final project should also be checked on desktop and mobile browsers and reviewed with an accessibility checker before submission.
