# TODO tasks for the web application

## Bugs

* "Loading" on leaf node detail / link list doesn't work, so stale content is shown until links load
* Fix broken tests

## Usability improvements

* Internationalize the UI text
* Reorganize node info boxes
* Replace UI "namespace" references with "Wiki" references
* Button to allow camera to center on current node (new behavior) or graph centroid (current behavior)
* Tune the LOD for billboards
* Mobile layout fixes (controls and info boxes)
* Add header to top of node view saying what current WP is
* Add descriptive text to main page

## Technical improvements

* Migrate to real db backend
* If not that, add indexes on sqlitedb

## Aesthetic improvements

* See if replacing leaf with link looks better
* Animate graph transitions (add/remove nodes)
* Consider color and material changes
* Match node info hover box border color with node color
* Put border on current node box and match with node color
