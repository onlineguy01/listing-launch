-- Generated from src/lib/directories/registry.ts. Do not edit by hand; run npm run seed:sql.
insert into directories (id, name, homepage, domains, tier, discovery, submission, owner_actions, eligible_categories, eligible_countries,
  allows_hidden_address, external_fee_cents, base_price_cents, est_human_minutes, active, notes)
values
(
  'google', 'Google Business Profile', 'https://www.google.com/business/', array['google.com','maps.google.com','g.page']::text[], 'maps', 'listings_db'::discovery_method, 'api'::submission_method,
  array['oauth']::owner_task_type[], null, array['US']::text[], true,
  0, 2500, 20, true, 'Discovery via Places API. Creation/claim requires owner OAuth; verification often by postcard or video.'
),
(
  'apple', 'Apple Business Connect', 'https://businessconnect.apple.com/', array['maps.apple.com','apple.com']::text[], 'maps', 'search_fetch'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], false,
  0, 1500, 15, true, 'Requires an Apple ID for the owner. Partner API exists for approved agencies.'
),
(
  'bing', 'Bing Places', 'https://www.bingplaces.com/', array['bing.com','bingplaces.com']::text[], 'maps', 'api'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 1000, 10, true, 'Can import from Google Business Profile once GBP is verified.'
),
(
  'yelp', 'Yelp', 'https://www.yelp.com/', array['yelp.com']::text[], 'review', 'api'::discovery_method, 'manual'::submission_method,
  array['email_confirm','sms_code']::owner_task_type[], null, array['US']::text[], true,
  0, 1500, 15, true, 'Discovery via Yelp Fusion phone search. Automation prohibited; owner-assisted claim only.'
),
(
  'facebook', 'Facebook Page', 'https://www.facebook.com/', array['facebook.com']::text[], 'review', 'search_fetch'::discovery_method, 'manual'::submission_method,
  array['oauth']::owner_task_type[], null, array['US']::text[], true,
  0, 1500, 15, true, 'Owner must create or grant page access. No automated creation.'
),
(
  'nextdoor', 'Nextdoor', 'https://business.nextdoor.com/', array['nextdoor.com']::text[], 'review', 'search_fetch'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 1000, 10, true, null
),
(
  'dataaxle', 'Data Axle', 'https://www.dataaxle.com/', array['dataaxle.com']::text[], 'aggregator', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 1500, 10, true, 'Data aggregator (formerly Infogroup). Feeds hundreds of downstream directories and apps. Verified by downstream propagation, not on its own site.'
),
(
  'localeze', 'Neustar Localeze', 'https://www.neustarlocaleze.biz/', array['neustarlocaleze.biz','localeze.com']::text[], 'aggregator', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 1500, 10, false, 'Paid aggregator; confirm the current annual fee and set externalFeeCents before activating. Pass-through, not marked up.'
),
(
  'foursquare', 'Foursquare', 'https://foursquare.com/', array['foursquare.com']::text[], 'aggregator', 'api'::discovery_method, 'form'::submission_method,
  array[]::owner_task_type[], null, array['US']::text[], false,
  0, 800, 6, true, 'Places API for discovery. Feeds many downstream map/data providers.'
),
(
  'yellowpages', 'Yellow Pages', 'https://www.yellowpages.com/', array['yellowpages.com']::text[], 'general', 'site_search'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], false,
  0, 800, 8, true, null
),
(
  'bbb', 'Better Business Bureau', 'https://www.bbb.org/', array['bbb.org']::text[], 'general', 'site_search'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 800, 10, true, 'Free profile; accreditation is paid and optional.'
),
(
  'manta', 'Manta', 'https://www.manta.com/', array['manta.com']::text[], 'general', 'search_fetch'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], false,
  0, 600, 6, true, null
),
(
  'merchantcircle', 'MerchantCircle', 'https://www.merchantcircle.com/', array['merchantcircle.com']::text[], 'general', 'site_search'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], false,
  0, 600, 6, true, null
),
(
  'superpages', 'Superpages', 'https://www.superpages.com/', array['superpages.com']::text[], 'general', 'site_search'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], false,
  0, 600, 6, true, null
),
(
  'linkedin', 'LinkedIn Company Page', 'https://www.linkedin.com/', array['linkedin.com']::text[], 'general', 'search_fetch'::discovery_method, 'manual'::submission_method,
  array['oauth']::owner_task_type[], null, array['US']::text[], true,
  0, 1000, 10, true, null
),
(
  'angi', 'Angi', 'https://www.angi.com/', array['angi.com']::text[], 'industry', 'search_fetch'::discovery_method, 'manual'::submission_method,
  array['email_confirm','sms_code']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 1200, 15, true, 'Home services only. Free profile; leads are paid and optional.'
),
(
  'houzz', 'Houzz', 'https://www.houzz.com/', array['houzz.com']::text[], 'industry', 'search_fetch'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 1000, 10, true, 'Home improvement and design only.'
),
(
  'dexknows', 'DexKnows', 'https://www.dexknows.com/', array['dexknows.com']::text[], 'general', 'site_search'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 6, true, 'Yellow Pages network (Thryv). A listing created on YP usually propagates here; verify separately.'
),
(
  'hotfrog', 'Hotfrog', 'https://www.hotfrog.com/', array['hotfrog.com']::text[], 'general', 'site_search'::discovery_method, 'form'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 6, true, 'Free listing; company pages carry JSON-LD. Probed live Nov 2026.'
),
(
  'brownbook', 'Brownbook', 'https://www.brownbook.net/', array['brownbook.net']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search page returns 403 to servers (bot wall). Needs owner-assisted or API path.'
),
(
  'cylex', 'Cylex', 'https://www.cylex.us.com/', array['cylex.us.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Homepage returns 403 to servers (bot wall).'
),
(
  'ezlocal', 'EZlocal', 'https://ezlocal.com/', array['ezlocal.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Homepage returns 403 to servers (bot wall).'
),
(
  'showmelocal', 'ShowMeLocal', 'https://www.showmelocal.com/', array['showmelocal.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'CAPTCHA challenge on every request.'
),
(
  'citysquares', 'CitySquares', 'https://citysquares.com/', array['citysquares.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Homepage returns 403 to servers (bot wall).'
),
(
  'n49', 'n49', 'https://www.n49.com/', array['n49.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search returns 403 to servers.'
),
(
  'yellowbook', 'Yellowbook', 'https://www.yellowbook.com/', array['yellowbook.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search ignores the business-name query (category browse only).'
),
(
  'ibegin', 'iBegin', 'https://www.ibegin.com/', array['ibegin.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search results page is generic navigation; listings not reachable by name.'
),
(
  '2findlocal', '2FindLocal', 'https://www.2findlocal.com/', array['2findlocal.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search is a client-side Google CSE widget.'
),
(
  'elocal', 'eLocal', 'https://www.elocal.com/', array['elocal.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Lead-gen marketplace; no server-rendered business search.'
),
(
  'localcom', 'Local.com', 'https://www.local.com/', array['local.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search URLs return 404; site is an ad-driven aggregator.'
),
(
  'chamberofcommerce', 'ChamberofCommerce.com', 'https://www.chamberofcommerce.com/', array['chamberofcommerce.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Search returns 403 to servers; directory pages are browsable by city only.'
),
(
  'mapquest', 'MapQuest', 'https://www.mapquest.com/', array['mapquest.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Client-rendered; data fed by Foursquare, so covered via the aggregator.'
),
(
  'alignable', 'Alignable', 'https://www.alignable.com/', array['alignable.com']::text[], 'general', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], null, array['US']::text[], true,
  0, 600, 8, false, 'Requires member login; owner-managed network.'
),
(
  'homeadvisor', 'HomeAdvisor', 'https://www.homeadvisor.com/', array['homeadvisor.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Bot wall (403). Pro profiles require owner phone verification: report-only when added.'
),
(
  'thumbtack', 'Thumbtack', 'https://www.thumbtack.com/', array['thumbtack.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Client-rendered app; pro accounts require owner identity. Report-only when added.'
),
(
  'porch', 'Porch', 'https://porch.com/', array['porch.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Search is address-based, not business-name; needs an API or owner path.'
),
(
  'buildzoom', 'BuildZoom', 'https://www.buildzoom.com/', array['buildzoom.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Bot wall (403). Profiles are built from license records.'
),
(
  'networx', 'Networx', 'https://www.networx.com/', array['networx.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['home_services']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Lead marketplace, no public business search.'
),
(
  'healthgrades', 'Healthgrades', 'https://www.healthgrades.com/', array['healthgrades.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['health']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Indexes individual providers, not practices; owner (provider) must claim. Report-only when added.'
),
(
  'zocdoc', 'Zocdoc', 'https://www.zocdoc.com/', array['zocdoc.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['health']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Bot wall (403); provider-claimed.'
),
(
  'vitals', 'Vitals', 'https://www.vitals.com/', array['vitals.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['health']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Bot wall (403); provider-claimed.'
),
(
  'webmd', 'WebMD Provider Directory', 'https://doctor.webmd.com/', array['doctor.webmd.com','webmd.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['health']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Client-rendered results; provider-claimed.'
),
(
  'avvo', 'Avvo', 'https://www.avvo.com/', array['avvo.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['legal']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Not yet probed (host limit). Attorney-claimed profiles: report-only when added.'
),
(
  'justia', 'Justia Lawyers', 'https://lawyers.justia.com/', array['justia.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['legal']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Not yet probed (host limit). Attorney-claimed profiles: report-only when added.'
),
(
  'tripadvisor', 'TripAdvisor', 'https://www.tripadvisor.com/', array['tripadvisor.com']::text[], 'industry', 'none'::discovery_method, 'manual'::submission_method,
  array['email_confirm']::owner_task_type[], array['restaurant']::text[], array['US']::text[], true,
  0, 800, 10, false, 'Not yet probed; known to block server fetches. Owner-claimed: report-only when added.'
)
on conflict (id) do update set
  name = excluded.name, homepage = excluded.homepage, domains = excluded.domains, tier = excluded.tier,
  discovery = excluded.discovery, submission = excluded.submission, owner_actions = excluded.owner_actions,
  eligible_categories = excluded.eligible_categories, eligible_countries = excluded.eligible_countries,
  allows_hidden_address = excluded.allows_hidden_address, external_fee_cents = excluded.external_fee_cents,
  base_price_cents = excluded.base_price_cents, est_human_minutes = excluded.est_human_minutes,
  active = excluded.active, notes = excluded.notes;
