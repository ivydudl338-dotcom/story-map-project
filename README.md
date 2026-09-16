# The Geography of Waiting

An interactive story map examining Philadelphia 311 abandoned-vehicle requests submitted in 2025. The project asks whether residents in different ZIP Codes experienced different administrative outcomes and waiting times.

The story focuses on three measures:

- Total abandoned-vehicle requests
- Share of requests still listed as open
- Share of requests closed within 180 days

Median closure time is shown as supporting context, because it describes closed cases only and excludes unresolved requests.

## Data sources

- [Philadelphia 311 Service and Information Requests](https://opendataphilly.org/datasets/311-service-and-information-requests/)
- [City of Philadelphia ZIP Code Boundaries](https://opendataphilly.org/datasets/zip-codes/)

The dataset used here contains requests submitted between January 1 and December 31, 2025. Its latest record update was September 12, 2026.

## Limitations

311 data represent reported and recorded problems, not every abandoned vehicle in the city. Reporting behavior may differ between communities. A request marked “closed” does not necessarily mean that a vehicle was removed. The maps describe geographic differences but cannot establish why those differences occurred.

## Technical notes

The project uses Leaflet and the course scrollytelling template. ZIP Code metrics were calculated from the 311 request records and joined to City of Philadelphia ZIP Code boundaries.
