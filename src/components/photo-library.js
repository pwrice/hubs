import "aframe";
import { proxiedUrlFor } from "../utils/media-url-utils";
import "./photo-thumbnail";

const AFRAME = window.AFRAME;
AFRAME.registerComponent("photo-library", {
  schema: {
    custom_data: { type: "string", default: "Hello, World!" }
  },
  init: function() {
    console.log("initializing photo libary component");

    this.photoSphereEl = this._createPhotoSphere();
    this.photoSphereEl.setAttribute("visible", false);
    const sceneEl = document.querySelector("a-scene:first-of-type");
    sceneEl.appendChild(this.photoSphereEl);

    this.el.appendChild(this._createShowHideButton());

    this.photoLibrary = {};
    this.currentPhotoId = null;

    this._loadPhotoData();
  },
  update: function(oldData) {
    if (this.data.custom_data !== oldData.custom_data) {
      console.log("photo-library date update:");
      console.log(this.data.custom_data);
    }
  },
  // private helper methods
  _createPhotoSphere: function() {
    const photoEl = document.createElement("a-entity");
    photoEl.setAttribute("id", "photo-sphere");
    photoEl.setAttribute("position", "0 10 0");
    photoEl.setAttribute("scale", "-1 1 1");
    photoEl.setAttribute("geometry", "primitive: sphere; radius: 100; segmentsWidth: 64; segmentsHeight: 64");
    // set default material w/ no photo
    photoEl.setAttribute("material", "shader: flat; color: #fff; side: back");
    photoEl.setAttribute("shadow", "cast: true;");
    return photoEl;
  },
  _createShowHideButton: function() {
    const buttonHolderEl = document.createElement("a-entity");
    buttonHolderEl.setAttribute("class", "ui interactable-ui");
    buttonHolderEl.setAttribute("position", "0 -0.2 0.2");

    const labelEl = document.createElement("a-entity");
    labelEl.setAttribute("class", "label");
    labelEl.setAttribute("text", "value: open; align: center; color: #fafafa;");
    labelEl.setAttribute("position", "0 0.15 0.081");
    labelEl.setAttribute("scale", "1.95 1.95 1.95");

    const buttonEl = document.createElement("a-entity");
    buttonEl.setAttribute("class", "label-action-background");
    buttonEl.setAttribute("mixin", "rounded-action-button");
    buttonEl.setAttribute("is-remote-hover-target", "");
    buttonEl.setAttribute("tags", "singleActionButton: true;");
    buttonEl.setAttribute("position", "0 0.15 0.08");
    buttonEl.setAttribute("scale", "1.0 1.0 1.0");
    this.buttonEl = buttonEl;
    buttonEl.object3D.addEventListener("interact", () => this._showHideButtonClicked());

    buttonHolderEl.appendChild(labelEl);
    buttonHolderEl.appendChild(buttonEl);

    return buttonHolderEl;
  },
  _loadPhotoData: function() {
    const proxyPhotoDataUrl = proxiedUrlFor("https://pwricemedia.s3-us-west-2.amazonaws.com/360Photos.json");
    fetch(proxyPhotoDataUrl).then(async res => {
      const photoDataJson = await res.json();
      this._photoDataLoaded(photoDataJson);
    });
  },
  _photoDataLoaded: function(photoDataJson) {
    console.log("_photoDataLoaded");
    console.log(photoDataJson);
    photoDataJson["photos"].map((p, ind) => {
      this.photoLibrary[ind] = {
        id: ind,
        url: p.url,
        thumb_url: p.thumb_url,
        index: ind
      };
    });

    this._generateThumbnails();
  },
  _generateThumbnails: function() {
    for (const [photoId, photoObj] of Object.entries(this.photoLibrary)) {
      this._addThumbnailAsset(photoObj.thumb_url, photoId);
    }
  },
  _addThumbnailAsset: function(thumbUrl, photoId) {
    // Currently using 400x200 images for thumbnails - too big? small?
    const proxyThumbUrl = proxiedUrlFor(thumbUrl);
    // Create a new asset
    const newAsset = document.createElement("img");
    const thumbnailAssetId = "thumbnailAsset" + photoId;
    newAsset.setAttribute("id", thumbnailAssetId);
    newAsset.setAttribute("src", proxyThumbUrl);
    newAsset.setAttribute("crossorigin", "anonymous");
    newAsset.addEventListener("load", (evt) => {
      console.log("Thumbnail loaded: " + thumbUrl);
      const thumbEl = this._createThumbnailSphere(photoId);
      const sceneEl = document.querySelector("a-scene:first-of-type");
      sceneEl.appendChild(thumbEl);
    });

    // Append the new video to the a-assets, where a-assets id="assets-id"
    const assetsEl = document.querySelector("a-assets:first-of-type");
    assetsEl.appendChild(newAsset);
  },
  _createThumbnailSphere: function(photoId) {
    const photoObj = this.photoLibrary[photoId];
    const numPhotos = Object.entries(this.photoLibrary).length;
    const thumbEl = document.createElement("a-entity");
    thumbEl.setAttribute("id", "thumb-sphere-" + photoId);
    // TODO - arrange these more neutrally for all viewers - maybe in a circle?
    const xLoc = -numPhotos / 2 + photoObj.index;
    const thumbnailAssetId = "thumbnailAsset" + photoId;
    thumbEl.setAttribute("position", `${xLoc} 2 0`);
    thumbEl.setAttribute("geometry", "primitive: sphere; radius: 0.4; segmentsWidth: 10; segmentsHeight: 10");
    thumbEl.setAttribute("material", `src: #${thumbnailAssetId}; shader: flat; color: #fff; side: back`);
    thumbEl.setAttribute("shadow", "cast: true;");
    // make selectable
    thumbEl.classList.add("interactable");
    thumbEl.setAttribute("tags", "singleActionButton: true;");
    thumbEl.setAttribute("is-remote-hover-target", "");
    thumbEl.setAttribute("photo-thumbnail", "");

    AFRAME.scenes[0].systems["hubs-systems"].cursorTargettingSystem.targets.push(thumbEl);
    thumbEl.object3D.addEventListener("interact", () => {
      console.log("Selected thumbnail! " + photoId);
      this._photoThumbnailClicked(photoId);
    });
    thumbEl.object3D.addEventListener("hovered", () => {
      console.log("Hover thumbnail! " + photoId);
      // TODO: add hover over effect
      // Set network state for hover (so others can see which photo is highlighted)
    });
    thumbEl.object3D.addEventListener("unhovered", () => {
      console.log("Unhover thumbnail! " + photoId);
      // TODO: remov hover over effect
      // remove network state for hover effect
    });

    return thumbEl;
  },
  _setPhoto: function(photoId) {
    const prevPhotoId = this.currentPhotoId;
    this.currentPhotoId = photoId;

    const assetsEl = document.querySelector("a-assets:first-of-type");
    const photoAssetId = "photoAsset"+photoId;
    const photoObj = this.photoLibrary[photoId];
    const proxyImageUrl = proxiedUrlFor(photoObj.url);

    const newAsset = document.createElement("img");
    newAsset.setAttribute("id", photoAssetId); // Create a unique id for asset
    newAsset.setAttribute("src", proxyImageUrl);
    newAsset.setAttribute("crossorigin", "anonymous");
    newAsset.addEventListener("load", (evt) => {
      console.log("360 image component: image loaded");
      this.photoSphereEl.setAttribute("material", `src: #${photoAssetId}; shader: flat; color: #fff; side: back;`);
      this.photoSphereEl.setAttribute("visible", true);

      if (prevPhotoId) {
        const prevPhotoAssetId = "photoAsset" + prevPhotoId;
        const prevPhotoAssetEl = document.getElementById(prevPhotoAssetId);
        if (prevPhotoAssetEl) {
          prevPhotoAssetEl.remove();
        }
      }
    });
    assetsEl.appendChild(newAsset);
  },
  _photoThumbnailClicked: function(photoId) {
    this._setPhoto(photoId);
  },
  _showHideButtonClicked: function() {
    // TODO - toggle thumbnail show/hide state
  }
});
