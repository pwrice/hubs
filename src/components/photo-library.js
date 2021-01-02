import "aframe";
import { proxiedUrlFor } from "../utils/media-url-utils";
import "./photo-thumbnail";

const AFRAME = window.AFRAME;
AFRAME.registerComponent("photo-library", {
  schema: {
    currentPhotoId: { type: "number", default: -1 },
    showThumbnails: { type: "boolean", default: false }
  },
  init: function() {
    console.log("initializing photo libary component");

    this.photoSphereEl = this._createPhotoSphere();
    this.photoSphereEl.setAttribute("visible", false);
    const sceneEl = document.querySelector("a-scene:first-of-type");
    sceneEl.appendChild(this.photoSphereEl);

    this.el.appendChild(this._createShowHideButton());

    this.photoLibrary = {};
    this.photoLibraryLoaded = false;
    this.currentPhotoId = -1;

    try {
      NAF.utils
        .getNetworkedEntity(this.el)
        .then(networkedEl => {
          this.networkedEl = networkedEl;
        })
        .catch(() => {}); //ignore exception, entity might not be networked
    } catch (e) {
      // NAF may not exist on scene landing page
    }

    this._loadPhotoData();
  },
  update: function(oldData) {
    if (this.data.currentPhotoId != oldData.currentPhotoId) {
      console.log("updating current photo to: " + this.data.currentPhotoId);
      this._setPhoto(this.data.currentPhotoId);
    }
    if (this.data.showThumbnails != oldData.showThumbnails) {
      console.log("updating showThumbnails: " + this.data.showThumbnails);
      this._setShowHideThumbnails(this.data.showThumbnails);
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
        index: ind,
        thumb_el: null
      };
    });

    this.photoLibraryLoaded = true;
    if (this.currentPhotoId) {
      this._setPhoto(this.currentPhotoId);
    }

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
      this.photoLibrary[photoId].thumb_el = thumbEl;
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
    thumbEl.setAttribute("position", `${xLoc} 3 0`);
    thumbEl.setAttribute("geometry", "primitive: sphere; radius: 0.4; segmentsWidth: 10; segmentsHeight: 10");
    thumbEl.setAttribute("material", `src: #${thumbnailAssetId}; shader: flat; color: #fff; side: back`);
    thumbEl.setAttribute("shadow", "cast: true;");
    // make selectable
    thumbEl.classList.add("interactable");
    thumbEl.setAttribute("tags", "singleActionButton: true;");
    thumbEl.setAttribute("is-remote-hover-target", "");
    thumbEl.setAttribute("photo-thumbnail", "");
    thumbEl.setAttribute("visible", false);

    AFRAME.scenes[0].systems["hubs-systems"].cursorTargettingSystem.targets.push(thumbEl);
    thumbEl.object3D.addEventListener("interact", () => {
      console.log("Selected thumbnail! " + photoId);
      this._photoThumbnailClicked(photoId);
    });
    thumbEl.object3D.addEventListener("hovered", () => {
      // console.log("Hover thumbnail! " + photoId);
      // TODO: add hover over effect
      // Set network state for hover (so others can see which photo is highlighted)
    });
    thumbEl.object3D.addEventListener("unhovered", () => {
      // console.log("Unhover thumbnail! " + photoId);
      // TODO: remov hover over effect
      // remove network state for hover effect
    });

    return thumbEl;
  },
  _setPhoto: function(photoId) {
    if (!this.photoLibraryLoaded) return;

    const photoObj = this.photoLibrary[photoId];

    if (photoId == -1 || !photoObj) {
      this.photoSphereEl.setAttribute("visible", false);
      return;
    }

    const prevPhotoId = (this.currentPhotoId != photoId) ? this.currentPhotoId : null;
    this.currentPhotoId = photoId;

    const assetsEl = document.querySelector("a-assets:first-of-type");
    const photoAssetId = "photoAsset" + photoId;
    const proxyImageUrl = proxiedUrlFor(photoObj.url);

    // set loading state
    photoObj.thumb_el.components["photo-thumbnail"].showLoader();

    const newAsset = document.createElement("img");
    newAsset.setAttribute("id", photoAssetId); // Create a unique id for asset
    newAsset.setAttribute("src", proxyImageUrl);
    newAsset.setAttribute("crossorigin", "anonymous");
    newAsset.addEventListener("load", (evt) => {
      console.log("360 image component: image loaded");
      this.photoSphereEl.setAttribute("material", `src: #${photoAssetId}; shader: flat; color: #fff; side: back;`);
      this.photoSphereEl.setAttribute("visible", true);

      // hide loader
      photoObj.thumb_el.components["photo-thumbnail"].hideLoader();

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
  _setShowHideThumbnails: function(show) {
    if (this.photoLibrary) {
      for (const [photoId, photoObj] of Object.entries(this.photoLibrary)) {
        photoObj.thumb_el.setAttribute("visible", show);
      }
    }
  },
  _photoThumbnailClicked: function(photoId) {
    const mine = NAF.utils.isMine(this.networkedEl);
    if (!mine) NAF.utils.takeOwnership(this.networkedEl);
    if (NAF.utils.isMine(this.networkedEl)) {
      this.el.setAttribute("photo-library", "currentPhotoId", photoId);
    }
  },
  _showHideButtonClicked: function() {
    console.log("_showHideButtonClicked");
    const mine = NAF.utils.isMine(this.networkedEl);
    if (!mine) NAF.utils.takeOwnership(this.networkedEl);
    if (NAF.utils.isMine(this.networkedEl)) {
      this.el.setAttribute("photo-library", "showThumbnails", !this.data.showThumbnails);
    }
  }
});
