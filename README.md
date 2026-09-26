# Mesha Canada 2026

Mobile-first, read-only travel companion for the 2026/10/01–10/13 Canada trip.

## Live data represented

- Vancouver / Whistler self-drive leg
- Yellowknife flight + flexible aurora days
- Victoria day trip
- Vancouver whale watching / city days
- Return flight to Taipei

The itinerary was distilled from the provided Google Sheet on 2026-09-26.

## UX

The information architecture is inspired by [Travel-lite-Template](https://github.com/world4jason/Travel-lite-Template):

- **Now**: pre-trip countdown or day-of schedule
- **Trip**: all days + alerts + fast day switching
- **Route**: daily route summaries with Google Maps handoff
- **Check**: per-device checklist stored in localStorage
- **More**: accommodation / flight summary and useful links
- responsive phone / desktop layouts
- light / dark / system theme
- PWA shell + offline cached itinerary
- hash-based deep links such as `#day/2026-10-10`

## Privacy choice

This repository is public. Booking confirmation codes and trip costs contained in the source spreadsheet are intentionally **not** published here. The site keeps only the details needed to execute the trip.

## Known itinerary issue surfaced by the site

On 2026-10-10, the source itinerary has whale watching from 12:00–17:00 with 11:00 check-in while also placing Granville Island in the midday-to-evening window. The site flags this as a schedule overlap instead of silently choosing one.

The 2026-10-06 and 2026-10-07 Yellowknife daytime schedules are intentionally left flexible because the spreadsheet does not specify activities.

## Preview

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## GitHub Pages

This is a no-build static site. Enable **Settings → Pages → Deploy from a branch → main / root** once. The expected URL is:

`https://world4jason.github.io/Mesha-Canada/`
