-- New discovery methods: a directory's own search page, and a licensed listings database
alter type discovery_method add value if not exists 'site_search';
alter type discovery_method add value if not exists 'listings_db';
