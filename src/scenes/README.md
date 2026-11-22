# 3D Scenes

`CrewwwWorld.tsx` is the dynamically imported fashion-district entrance for the `/` showroom. It contains only procedural environmental geometry and user-supplied local product photos. Commerce selection stays in React (`ShowroomPage`); Three.js raycast hits call the same destination callback as the accessible DOM links.

`HoodieViewer.tsx` is a separate dynamically imported product-inspection viewer. Both scenes use direct Three.js to share one runtime chunk and avoid adding R3F/Drei for a small, still-rendered scene.

Both scenes keep fallback DOM/CSS paths, bound pixel ratio, avoid continuous render loops and dispose owned geometry/materials/textures on unmount. These procedural scenes are experience prototypes, not approved product/environment modeling. Physical mobile performance and screen-reader review remain open.
