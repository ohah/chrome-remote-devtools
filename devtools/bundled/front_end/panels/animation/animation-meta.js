// gen/front_end/panels/animation/animation-meta.prebundle.js
import * as Common from "./..\\..\\core\\common\\common.js";
import * as i18n from "./..\\..\\core\\i18n\\i18n.js";
import * as SDK from "./..\\..\\core\\sdk\\sdk.js";
var loadedAnimationModule;
var UIStrings = {
  /**
   * @description Title for the 'Animations' tool in the bottom drawer
   */
  animations: "Animations",
  /**
   * @description Command for showing the 'Animations' tool in the bottom drawer
   */
  showAnimations: "Show Animations"
};
var str_ = i18n.i18n.registerUIStrings("panels/animation/animation-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
async function loadAnimationModule() {
  if (!loadedAnimationModule) {
    loadedAnimationModule = await import("./animation.js");
  }
  return loadedAnimationModule;
}
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.AnimationModel.AnimationGroup
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Animation = await loadAnimationModule();
    return new Animation.AnimationTimeline.AnimationGroupRevealer();
  }
});
//# sourceMappingURL=animation-meta.js.map
