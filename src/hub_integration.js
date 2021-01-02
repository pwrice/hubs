import "./components/photo-library";

export function processMediaLoaded(model) {
  console.log("calling processMediaLoaded!!");
  if (model.parent.el.components["media-loader"]) {
    const mediaEl = model.parent.el;
    switch (mediaEl.components["media-loader"].attrValue.src) {
      // Hamburger
      case "https://poly.google.com/view/eke7qcu_FR2":
        console.log("found the hamburger hash!!");
        NAF.utils.getNetworkedEntity(mediaEl).then(networkedEl => {
          networkedEl.setAttribute("photo-library", { custom_data: "foo" });
        });
        break;
    }
  }
}

export function updateNetworkSchemas() {
  if (NAF.schemas.schemaDict["#interactable-media"].components.indexOf("photo-library") <= 0) {
    NAF.schemas.schemaDict["#interactable-media"].components.push("photo-library");
  }
}

// to change network state:
/*

function getFirstElementFromHash(hash){
	var g = AFRAME.scenes[0].querySelectorAll("[media-loader]")
	var matches = []
	for (let e of g){
		var m = e.components["media-loader"].attrValue.src.match(hash)
		if (m && m.length) matches.push(e)
	}
	return matches[0]
}
var ham = getFirstElementFromHash("eke7qcu_FR2");

NAF.utils.getNetworkedEntity(ham).then(networkedEl => {
  const mine = NAF.utils.isMine(networkedEl)
  if (!mine) var owned = NAF.utils.takeOwnership(networkedEl)
  networkedEl.setAttribute("photo-library", { custom_data: {"one": "two"} });
});
 */
