import "aframe";

const AFRAME = window.AFRAME;
AFRAME.registerComponent("test-component", {
  schema: {
    custom_data: { type: "string", default: "Hello, World!" }
  },
  init: function() {
    console.log("initializing test component");
  },
  update: function(oldData) {
    if (this.data.custom_data !== oldData.custom_data) {
      console.log("test-component date update:");
      console.log(this.data.custom_data);
    }
  }
});
