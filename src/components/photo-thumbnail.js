import "aframe";

const AFRAME = window.AFRAME;

import loadingObjectSrc from "../assets/models/LoadingObject_Atom.glb";
import { SOUND_MEDIA_LOADING, SOUND_MEDIA_LOADED } from "../systems/sound-effects-system";
import { loadModel } from "./gltf-model-plus";
import { cloneObject3D } from "../utils/three-utils";
import { waitForDOMContentLoaded } from "../utils/async-utils";

import { SHAPE } from "three-ammo/constants";

let loadingObjectEnvMap;
let loadingObject;

waitForDOMContentLoaded().then(() => {
  loadModel(loadingObjectSrc).then(gltf => {
    loadingObject = gltf;
  });
});

// A strippped down version of the media-loader component that just shows the loading animation.

AFRAME.registerComponent("photo-thumbnail", {
  schema: {
    playSoundEffect: { default: true }
  },

  init() {
    this.onError = this.onError.bind(this);
    this.showLoader = this.showLoader.bind(this);
    this._showLoader = this._showLoader.bind(this);
    this.clearLoadingTimeout = this.clearLoadingTimeout.bind(this);
    this.hideLoader = this.hideLoader.bind(this);
    this.originalMesh = null;
  },

  removeShape(id) {
    if (this.el.getAttribute("shape-helper__" + id)) {
      this.el.removeAttribute("shape-helper__" + id);
    }
  },

  tick(t, dt) {
    if (this.loaderMixer) {
      this.loaderMixer.update(dt / 1000);
    }
  },

  remove() {
    const sfx = this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem;
    if (this.loadingSoundEffect) {
      sfx.stopPositionalAudio(this.loadingSoundEffect);
      this.loadingSoundEffect = null;
    }
    if (this.loadedSoundEffect) {
      sfx.stopPositionalAudio(this.loadedSoundEffect);
      this.loadedSoundEffect = null;
    }
  },

  onError() {
    this.clearLoadingTimeout();
  },

  showLoader() {
    if (!this.showLoaderTimeout) {
      this.showLoaderTimeout = setTimeout(this._showLoader, 100);
    }
  },

  _showLoader() {
    console.log("showingLoader");

    const useFancyLoader = !!loadingObject;

    const mesh = useFancyLoader
      ? cloneObject3D(loadingObject.scene)
      : new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

    this.originalMesh = this.el.getObject3D("mesh");
    this.el.setObject3D("mesh", mesh);

    // this.updateScale(true, false);

    if (useFancyLoader) {
      const environmentMapComponent = this.el.sceneEl.components["environment-map"];
      if (environmentMapComponent) {
        const currentEnivronmentMap = environmentMapComponent.environmentMap;
        if (loadingObjectEnvMap !== currentEnivronmentMap) {
          environmentMapComponent.applyEnvironmentMap(mesh);
          loadingObjectEnvMap = currentEnivronmentMap;
        }
      }

      this.loaderMixer = new THREE.AnimationMixer(mesh);

      this.loadingClip = this.loaderMixer.clipAction(mesh.animations[0]);
      this.loadingScaleClip = this.loaderMixer.clipAction(
        new THREE.AnimationClip(null, 1000, [
          new THREE.VectorKeyframeTrack(".scale", [0, 0.2], [0, 0, 0, mesh.scale.x, mesh.scale.y, mesh.scale.z])
        ])
      );
      setTimeout(() => {
        if (!this.loaderMixer) return; // Animation/loader was stopped early
        this.el.setAttribute("shape-helper__loader", { type: SHAPE.BOX });
      }, 200);

      this.loadingClip.play();
      this.loadingScaleClip.play();
    }

    if (
      this.el.sceneEl.is("entered") &&
      (!this.networkedEl || NAF.utils.isMine(this.networkedEl)) &&
      this.data.playSoundEffect
    ) {
      this.loadingSoundEffect = this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
        SOUND_MEDIA_LOADING,
        this.el.object3D,
        true
      );
    }

    delete this.showLoaderTimeout;
  },

  clearLoadingTimeout() {
    clearTimeout(this.showLoaderTimeout);
    if (this.loadingSoundEffect) {
      this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.stopPositionalAudio(this.loadingSoundEffect);
      this.loadingSoundEffect = null;
    }
    if (this.loaderMixer) {
      this.loadingClip.stop();
      this.loadingScaleClip.stop();
      delete this.loaderMixer;
      delete this.loadingScaleClip;
      delete this.loadingClip;
    }
    delete this.showLoaderTimeout;
    this.removeShape("loader");
  },

  hideLoader() {
    this.clearLoadingTimeout();

    this.el.setObject3D("mesh", this.originalMesh);

    if (this.el.sceneEl.is("entered") && this.data.playSoundEffect) {
      this.loadedSoundEffect = this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
        SOUND_MEDIA_LOADED,
        this.el.object3D,
        false
      );
    }
  }
});
