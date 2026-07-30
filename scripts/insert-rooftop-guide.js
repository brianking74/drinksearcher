#!/usr/bin/env node
/**
 * Insert rooftop bars guide into Supabase blog_posts.
 * Uses fetch (no dependency required).
 * Run: node scripts/insert-rooftop-guide.js
 */

const SUPABASE_URL = 'https://kktlbznmhxaortogqspy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdGxiem5taHhhb3J0b2dxc3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg3NjI4ODIsImV4cCI6MjAzNDMzODg4Mn0.-_pFvMkHk7IhLDNnZ8OENMRH5Rw8Pz2bq6tGcOFM';

const body = `\
<div class="guide-embed">
<p>Hong Kong's skyline deserves a front-row seat. Our guide to 10 rooftop bars from hotel lounges to hidden terraces.</p>

<h3>1. Cardinal Point — The Peak</h3>
<p><strong>\u2605 4.5 \u00b7 $$$$ \u00b7 Cocktail Bar, Rooftop Bar</strong><br>Perched atop The Peak Tower with a 270-degree panorama of Victoria Harbour. The covered terrace works year-round and the signature lychee martini is a crowd-pleaser.</p>

<h3>2. Sugar — Taikoo Shing</h3>
<p><strong>\u2605 4.4 \u00b7 $$$ \u00b7 Cocktail Bar, Rooftop Bar</strong><br>32nd floor of the East Hong Kong Hotel with a panorama from Eastern Harbour Crossing to Victoria Peak. Part-garden, part-terrace with tropical cocktails.</p>

<h3>3. OZONE — West Kowloon</h3>
<p><strong>\u2605 4.6 \u00b7 $$$$ \u00b7 Hotel Bar, Rooftop Bar</strong><br>The highest bar in the world at 490m on the 118th floor of the Ritz-Carlton. Japanese-influenced cocktails and weekend brunch.</p>

<h3>4. Popinjays — Central</h3>
<p><strong>\u2605 4.5 \u00b7 $$$$ \u00b7 Hotel Bar, Rooftop Bar</strong><br>25th floor of The Murray with a terrace wrapping around the building. Clarified milk punches and house-made tinctures.</p>

<h3>5. Aqua Spirit — Tsim Sha Tsui</h3>
<p><strong>\u2605 4.5 \u00b7 $$$ \u00b7 Cocktail Bar, Rooftop Bar</strong><br>29th floor of One Peking Road with an outdoor terrace facing the Central skyline. Japanese whisky highballs to Italian amaro classics.</p>

<h3>6. Terrible Baby — Jordan</h3>
<p><strong>\u2605 4.3 \u00b7 $$$ \u00b7 Cocktail Bar, Rooftop Bar</strong><br>Eaton HK's plant-filled rooftop with vintage furniture and local art. Barrel-aged negronis and natural wine. Covered section works rain or shine.</p>

<h3>7. Cruise Restaurant &amp; Bar — North Point</h3>
<p><strong>\u2605 4.5 \u00b7 $$$$ \u00b7 Rooftop Bar, Restaurant</strong><br>42nd floor of Hyatt Centric Victoria Harbour. Tropical cocktails and Southeast Asian-inspired food.</p>

<h3>8. Aeris — Mong Kok</h3>
<p><strong>\u2605 4.2 \u00b7 $$$ \u00b7 Sky Bar, Lounge</strong><br>Rooftop of the Cordis Hotel, 30 storeys above Mong Kok. Poolside loungers and weekday happy hour (5\u20137PM).</p>

<h3>9. La Rambla Terrace — Central</h3>
<p><strong>\u2605 4.3 \u00b7 $$$ \u00b7 Spanish Bar, Rooftop</strong><br>IFC rooftop with Spanish wines — sherry, Albariño, Rioja, cava. Iberico pork and jam\u00f3n croquetas.</p>

<h3>10. Topping Lane — Central</h3>
<p><strong>\u2605 4.4 \u00b7 $$$ \u00b7 Cocktail Bar, Rooftop</strong><br>Hidden above Russell Street with warm string lights and a retractable roof. Seasonal cocktails and bao buns.</p>
</div>`;

(async () => {
  const res = await fetch(SUPABASE_URL + '/rest/v1/blog_posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      title: '10 rooftop bars worth crossing the harbour for',
      excerpt: "Hong Kong's skyline deserves a front-row seat. Our guide to 10 rooftop bars from hotel lounges to hidden terraces.",
      body,
      published: true,
      published_at: new Date().toISOString()
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Insert failed (' + res.status + '):', err);
    process.exit(1);
  }
  console.log('\u2713 Guide post created');
})();
