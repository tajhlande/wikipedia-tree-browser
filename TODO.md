# TODO tasks for the web application

## Compliance

* Add a privacy policy statement in the app. See https://wikitech.wikimedia.org/wiki/Wikitech:Cloud_Services_Terms_of_use
* Link to the Cloud Services end user terms of use https://wikitech.wikimedia.org/wiki/Wikitech:Cloud_Services_End_User_Terms_of_use


## Security (Internet Exposure)

### Critical Priority

* Set CORS environment variables in toolforge

### High Priority
* **Add Rate Limiting** - Implement rate limiting on all API endpoints to prevent DoS attacks and API abuse (use `slowapi` or `fastapi-limiter`)
* **Sanitize Error Messages** - Remove internal error details from HTTP responses; log detailed errors server-side only

### Medium Priority
* **Configure Production Logging** - Replace `logging.DEBUG` with environment-based logging level (use `LOG_LEVEL` env var)
* **Add Input Validation for Limits** - Add maximum value constraints to pagination parameters (e.g., `limit` should have `le=1000`)
* **Add Security Headers** - Implement middleware for X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, and HSTS headers

### Low Priority
* **Validate Namespace Format** - Add regex validation for namespace parameter to prevent potential path traversal
* **Add API Versioning** - Implement version prefix in routes (e.g., `/api/v1/clusters/`) for better change management

## Deployment

None

## Bugs

* Loading spinner needed after navigating and before nodes are loaded
* Parent button is placing departed node billboards too close to their parent

## Usability improvements

* Search across all nodes to cross-navigate tree
* Reorganize node info boxes
* Mobile layout fixes (controls and info boxes)
* Tune the LOD for billboards

## Technical and performance improvements

* Caching in API layer of request + response
* Migrate to real db backend

## Aesthetic improvements

* See if replacing leaf with link looks better
* Animate graph transitions (add/remove nodes)
* Consider color and material changes - example: layer on monthly readership or number of edits
* Match node info hover box border color with node color
* Put border on current node box and match with node color
