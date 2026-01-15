# WP Embeddings Visualization Requirements

The purpose of this application is to visualize the clustered embeddings for a given wiki namespace (corresponding to
a particular language Wikipedia) in a hierarchical, navigable fashion.

Each wiki's content pages have been processed through embeddings and then grouped into hierarchical clusters that
all link back to a root node for that wiki.  Each leaf node corresponds to a Wiki page, and
each non-leaf node corresponds to a cluster that has been labeled with a topic.

## User experience

The sections below describe the user experience

### Initial state

The user must select a namespace from one of the available namespaces to begin the visualization.

### Visual Display / Node view

The general visual display is to show each node as a sphere, and each link to another node as a stem,
similar to the ball-and-stick model in molecular chemistry.

The view is contextualized by a currently selected node, and starts with the root node. Other nodes that
link to the current node as children in the hierarchy are displayed with links of equal length, in directions
corresponding to the embeddings.  Cluster nodes have a centroid computed from the combined embeddings in the cluster,
and leaf nodes have their own embeddings. Both have been reduced to three dimensional vectors.

Nodes should be colored by:
* The root node should always be the same color: red
* Leaf nodes corresponding to wiki pages should always be the same color: Wikipedia link blue
* Other non-leaf, non-root nodes should be colored by their depth from the root node, ranging from orange to green. There
are 11 levels of depth in the English Wikipedia graph, so a range of colors up to 12 should suffice. It is ok if colors
repeat, as long as colors at neighboring depths (say depth 4 and depth 5) are not the same or are not distinguishable.

### Node Billboard Labels

Each node should have a billboard label displaying its topic or title:
* **Billboard Behavior**: Labels should always face the camera (billboard mode)
* **Positioning**: Billboard labels should be centered vertically and horizontally, colinear with the link vector, positioned past the child node by a 0.4 unit margin
* **Width**: Billboard width should be double the original size (3.0 units wide)
* **Dynamic Sizing**: Billboards should have consistent width with height that expands to accommodate multi-line text
* **Completeness**: Billboard text should not be clipped or truncated
* **Rendering Consistency**: Text should be rendered in its natural aspect ratio without vertical or horizontal distortion
* **Root Node Handling**: Root nodes should use default positioning (above the node) since they have no parent
* **Text Appearance**: Light gray text (#CCCCCC) on transparent background with bold Arial font

Along the top, there should be overlay text that shows the current topic, the current Wiki namespace & name,
and the current depth.

### Desktop Interaction

* The following user interactions are in the node view:
* The user can drag and rotate the current view, as is the default interaction in Babylon.js.
* Mouse-hovering over a node should display overlay text that shows the node's topic or wiki page title.
* Clicking on a node navigates to that node, making it the currently selected node.
* There is a button to return to the parent node, if not on the root node.
* There is also a button to return "Home", to the initial state of the application.
* If the current node is a leaf node, there should be a clickable link to visit the Wikipedia page.


### Transitions and Performance.

The English Wikipedia graph has 320718 cluster nodes and 7083189 pages, so rendering meshes for every node
is not feasible. The app must handle this smoothly by loading what is needed when it is needed.
For a given node view, the current node, the node's children, and the node's parent are needed for rendering.

When a user selects a node, the view should smoothly transition to:
1. Show the children and parents of the selected node
2. Center the selected node
2. Hide the children and parents of the node we departed, if they aren't the current node or its children or parent.

Some amount of caching in the browser may be used to assist with the performance.

### Meshes, Rendering, Lighting, and Textures

The background should be black.

The lighting should be diffuse and non-directional, or not-very directional, so that as the user rotates the node around,
parts of the scene don't appear significantly darker than others.

The texture for spheres should be slightly shiny, enough to have a specular highlight, but not too shiny.

The texture for links should be a uniform gray of the same shininess.

Link ends should terminate within the radius of the spheres so that they appear to be connected.

The meshes for spheres and links should be as simple as possible while still appearing to have smooth roundness.
Include adjustable constant settings in the code to change the number of nodes in the mesh as appropriate, to save space.
Reuse meshes for the sphere and links and recolor/retexture as appropriate.

Enable whatever rendering optimizations are necessary and useful to accelerate the view.

## Technical Questions

### Backend API Configuration:

Q: What is the base URL for the backend API? (e.g., http://localhost:8000/api)
A: Assume for now that the base URL for the backend API is the default URL for a local FastAPI dev deployment.

Q: Are there any authentication requirements for the API endpoints?
A: No authentication is required. No data will be written back to the API.

Q: What CORS configuration is needed for the frontend to communicate with the backend?
A: We do not need to worry about CORS constraints for this project. There need not be any restrictions.

### Data Structure:

Q: Do the cluster nodes in the database contain the 3D vector coordinates needed for positioning?
A: The data structure does not have them yet, but it will.

Q: What is the exact format of the 3D vectors stored in the database?
A: JSON array of three floating point numbers.

Q: Are there any additional fields in the cluster or page data that should be displayed?
A: The important fields in the cluster to be displayed are the label (also called "final_label", and the depth).

### Performance Requirements:

Q: What is the expected minimum performance target (FPS) for the application?
A: 30 FPS is acceptable, 60 FPS is ideal.

Q: Are there specific browser requirements or supported browsers?
A: Firefox, Google Chrome, and Safari on macOS, Windows 11, and Linux desktops. We will not worry about mobile browsers yet.

Q: Should we implement any specific performance monitoring or analytics?
A: A nice to have: a toggle to display FPS in the lower left corner of the viewport.

### Visual Design:

Q: Are there specific color codes for "Wikipedia link blue" that should be used?
A: #3366CC

Q: Should the node sizes be proportional to the number of documents in the cluster?
A: No. Nodes should always be shown at a consistent size.

Q: Are there any specific font requirements for the overlay text?
A: I have not selected a font yet. A sans-serif font that has coverage for many languages is preferred.

## Implementation Questions

### Development Environment:

Q: Should I use the existing frontend structure or create a new one?
A: Use existing frontend structure as appropriate.  Remove pages, components, or elements that are not needed;
 add pages, components, or elements that are needed.

Q: Are there any specific coding conventions or linting rules to follow?
A: Prefer Typescript. Use standard Typescript formatting and linting.

Q: Should I use the existing Babylon.js setup or configure it differently?
A: Configure it differently if that is needed. You do not need to preserve the sample scene.

### Testing Strategy:

Q: Are there specific testing frameworks or approaches preferred?
A: There isn't one selected yet. Select one that is well known, supported, and use it.


### Deployment Considerations:

Q: Are there any specific build requirements or deployment constraints?
A: It will eventually be deployed to Toolforge in the Wikimedia Cloud. Beyond that, there are not.

Q: Should the application be optimized for a specific hosting environment?
A: No.

Q: Are there any environment variables that need to be configured?
A: None yet.

## Clarification Questions

### Namespace Selection:

Q: Should the namespace selection be a separate screen or an overlay?
A: When selecting a namespace, there shouldn't be anything to visualize yet.

Q: Are there any specific namespaces that should be prioritized or highlighted?
A: No. Namespaces should be listed according to what the backend gives you.

Q: Should we cache the namespace list locally for offline use?
A: It can be cached in the front end but should be reloaded when the page is refreshed.

### Node Interaction:

Q: Should clicking on a node immediately navigate or show a confirmation?
A: Immediate navigation is preferred.

Q: Are there any specific animation requirements for transitions?
A: In the requirements given above, those events should happen in that order, though they may overlap. Easing
in and out is fine. Nodes that remain on the screen should be continuously visible. The overall effect should be that
of the viewer moving smoothly to view a different part of a continuous model.

Q: Should we implement any keyboard shortcuts for navigation?
A: No.

### Error Handling:

Q: Are there specific error messages or user notifications required?
A: Console log messages of the specific type will suffice for now

Q: Should we implement automatic retry logic for failed API calls?
A: Not yet. That will be important later, but for now we should not mask errors in the local dev environment with retry.

Q: Are there any specific logging requirements?
A: No.

## Priority Questions

### Implementation Order:

Q: Should I follow the exact phase order in the implementation plan?
A: You should implement enough to get a minimal proof of concept working,

Q: Are there any specific milestones or deadlines to meet?
A: I would like this to be complete in time for the 25th anniversary of Wikipedia on January 15, 2026.

Q: Should I focus on a minimum viable product first or implement all features?
A: Focus on a minimum viable product first.

### Code Review Process:

Q: Should I create pull requests for each phase or for the entire implementation?
A: You do not need to create pull requests.  I will review each phase and then commit it to git. Implementation on the next phase
should not proceed until I've accepted the current phase.

Q: Are there specific code review guidelines to follow?
A: No.

Q: Should I include documentation with each implementation phase?
A: Documentation of the application architecture and importnat implementation decisions should be added to `README.md`.

# Important rules

* DO NOT MAKE SCHEMA CHANGES TO THE DATABASE.  The database structure is a requirement as-is.
* If a problem could be fixed either in the backend or in the frontend, prefer the front-end, unless the backend has an actual bug to fix where
the expected behavior is not happening.
