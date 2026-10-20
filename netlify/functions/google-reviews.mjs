const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });

export default async () => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return json({ error: 'Google reviews are not configured.' }, 404);
  }

  try {
    const response = await fetch(`${GOOGLE_PLACES_URL}/${encodeURIComponent(placeId)}?languageCode=fr`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri'
      }
    });

    if (!response.ok) {
      console.error(`Google Places API responded with status ${response.status}.`);
      return json({ error: 'Google Places API request failed.' }, 502);
    }

    const place = await response.json();
    const reviews = (place.reviews ?? [])
      .map(review => ({
        author: review.authorAttribution?.displayName ?? 'Client Google',
        rating: review.rating ?? 5,
        text: (review.text?.text ?? review.originalText?.text ?? '').trim(),
        date: review.relativePublishTimeDescription
      }))
      .filter(review => review.text.length > 0);

    return json(
      { rating: place.rating, count: place.userRatingCount, url: place.googleMapsUri, reviews },
      200,
      {
        // Un seul appel Google par jour et par région : le coût reste dans le quota gratuit.
        'Cache-Control': 'public, max-age=3600',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400'
      }
    );
  } catch (error) {
    console.error('Unable to fetch Google reviews.', error);
    return json({ error: 'Unable to fetch Google reviews.' }, 502);
  }
};
