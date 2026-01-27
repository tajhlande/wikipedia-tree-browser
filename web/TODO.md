# TODO tasks for the web application

## Bugs

* Node information box still visible when navigating back to namespace chooser
* Parent button is placing departed nodes too close to their parent
* "Loading" on leaf node detail / link list doesn't work, so stale content is shown until links load
* Fix broken tests

## Usability improvements

* Internationalize the UI text
* Reorganize node info boxes
* Tune the LOD for billboards
* Mobile layout fixes (controls and info boxes)
* Add descriptive text to main page

## Technical improvements

* Create script that copies a working namespace SQLite db to a slimmer read-only version for distribution
* Migrate to real db backend
* If not that, add indexes on sqlitedb

## Aesthetic improvements

* See if replacing leaf with link looks better
* Animate graph transitions (add/remove nodes)
* Consider color and material changes - example: layer on monthly readership or number of edits
* Match node info hover box border color with node color
* Put border on current node box and match with node color
