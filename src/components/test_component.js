import "aframe";
import { proxiedUrlFor } from "../utils/media-url-utils";

const AFRAME = window.AFRAME;
AFRAME.registerComponent("test-component", {
  schema: {
    custom_data: { type: "string", default: "Hello, World!" }
  },
  init: function() {
    console.log("initializing test component");

    const proxyImageUrl = proxiedUrlFor("https://pwricemedia.s3-us-west-2.amazonaws.com/deck_360.jpg");
    // Create a new asset
    const new_asset = document.createElement("img");
    new_asset.setAttribute("id", "threeDPhoto"); // Create a unique id for asset
    new_asset.setAttribute("src", proxyImageUrl);
    new_asset.setAttribute("crossorigin", "anonymous");

    new_asset.addEventListener("load", (evt) => {
      console.log("image loaded");
      const photoEl = document.createElement("a-entity");
      photoEl.setAttribute("id", "photo-sphere");
      photoEl.setAttribute("position", "0 10 0");
      photoEl.setAttribute("scale", "-1 1 1");
      photoEl.setAttribute("geometry", "primitive: sphere; radius: 100; segmentsWidth: 64; segmentsHeight: 64");
      photoEl.setAttribute("material", "src: #threeDPhoto; shader: flat; color: #fff; side: back");
      photoEl.setAttribute("shadow", "cast: true;");

      // Append the new video to the a-assets, where a-assets id="assets-id"
      const sceneEl = document.querySelector("a-scene:first-of-type");
      sceneEl.appendChild(photoEl);
      this.photoEl = photoEl;
    });

    // Append the new video to the a-assets, where a-assets id="assets-id"
    const assetsEl = document.querySelector("a-assets:first-of-type");
    assetsEl.appendChild(new_asset);
  },
  update: function(oldData) {
    if (this.data.custom_data !== oldData.custom_data) {
      console.log("test-component date update:");
      console.log(this.data.custom_data);
    }
  }
});
