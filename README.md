# zigzag
---

The project is live on : https://zigzag-project.org/

The [ios App](https://apps.apple.com/us/app/zigzag-project/id6754614690) is also available.


## zigzag project

The zigzag project is a **social project mapping platform** that allows users to create, share, and discover events on an interactive map. Users can organize friends into circles, create location-based events, and filter content by tags and timeline.

## Technology stack
- **Backend:**  
  Built with **Django 4.2**, hosted on **Railway**.

- **Frontend:**  
  Built with **React (Vite)**, hosted on **Vercel**.

- **Maps:**  
  - **MapTiler** provides the **map data and visual tiles** (roads, buildings, terrain, etc.).  
  - **Leaflet** is the **map viewer** used to display and interact with maps in the browser.  
  - **MapLibre GL Leaflet** connects Leaflet with MapTiler’s vector tiles for smooth, modern map render
Package used : https://www.npmjs.com/package/@maplibre/maplibre-gl-leaflet.


## 🔧 Project Setup

### Prerequisites

* ***Python >=3.9, <3.13***
* Node.js (Install: [https://nodejs.org/en/download](https://nodejs.org/en/download))
* OS: Windows/macOS

---


## Installation

To dev in local and start contributing, please visit the wiki : [Setting Up your environment](https://github.com/theoeif/zigzag/wiki/Setting-Up-your-environment)


## Known issues

[Issue Link Creation](https://github.com/theoeif/zigzag/issues/new?body=%23%23%20Actual%20Behavior%0D%0D%0D%23%23%20Expected%20Behavior%0D%0D%0D%23%23%20Steps%20to%20Reproduce%0D%0D%0D%23%23%20Screenshot&labels=bug)

## Long term

-  \>300 :
    - Add Friends relationships :
         - see friends of friends events when Number > 300 : marker and project.
         - Found list of friends instead of user on the plateform.
    - People could add their circle into a project.
    - Introduce some public event when Number > 1000
- Add conversating messaging functionnality to contact people.
- Implementing a dapp for financing project through the blockchain. (compatible capacitor)


## Credits and references
Related projects : La carte des collocs, Leaflet


[Doc github markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

[Build doc landing page](https://github.com/GrapesJS/grapesjs)
