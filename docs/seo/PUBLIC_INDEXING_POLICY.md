# Public indexing policy

CTG One indexes public product, company, evidence, roadmap, and investment-information surfaces that are intentionally published for external discovery.

Public evidence surfaces such as `/technology/status`, `/changelog`, and `/labs` belong in `sitemap.xml` because they explain capability maturity, documented change, and experimentation boundaries.

Authenticated, administrative, operational, and internal-knowledge surfaces must not be advertised in `sitemap.xml`. This includes `/dashboard`, `/admin`, `/knowledge`, `/inversion/app`, and `/inversion/admin`. Route-level `robots` metadata and `robots.txt` remain the enforcement layer where applicable; the sitemap is only the positive discovery surface.

Roadmap pages may remain indexable when their purpose is to communicate that a capability is not yet live. Indexability must never be used as evidence that the underlying capability is production-ready.
