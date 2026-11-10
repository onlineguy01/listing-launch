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
)
on conflict (id) do update set
  name = excluded.name, homepage = excluded.homepage, domains = excluded.domains, tier = excluded.tier,
  discovery = excluded.discovery, submission = excluded.submission, owner_actions = excluded.owner_actions,
  eligible_categories = excluded.eligible_categories, eligible_countries = excluded.eligible_countries,
  allows_hidden_address = excluded.allows_hidden_address, external_fee_cents = excluded.external_fee_cents,
  base_price_cents = excluded.base_price_cents, est_human_minutes = excluded.est_human_minutes,
  active = excluded.active, notes = excluded.notes;
