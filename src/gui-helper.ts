import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { Record3DScene } from './Record3DScene'

export const guiHelper = (scene: Record3DScene) => {
  const gui = new GUI()

  gui
    .add(scene.options, 'modelScale')
    .min(1)
    .max(20)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setScale(scene.options.modelScale)
      }
    })

  gui
    .add(scene.options, 'modelPointSize')
    .min(0.1)
    .max(20)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setPointSize(scene.options.modelPointSize)
      }
    })

  gui
    .add(scene.options, 'opacity')
    .min(0.1)
    .max(1.0)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setOpacity(scene.options.opacity)
      }
    })

  gui
    .add(scene.options, 'saturation')
    .min(0.0)
    .max(3.0)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setSaturation(scene.options.saturation)
      }
    })

  gui
    .addColor(scene.options, 'singleColorVec')
    .name('Color')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setSingleColor(scene.options.singleColorVec)
      }
    })

  gui
    .add(scene.options, 'useSingleColor')
    .name('Use single color')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setUseSingleColor(scene.options.useSingleColor)
      }
    })

  gui
    .add(scene.options, 'renderNthPoint')
    .name('Render each nth point only')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setRenderNthPoint(scene.options.renderNthPoint)
      }
    })

  gui.add(scene.options, 'toggleSound').name('Mute/Unmute')
  gui.add(scene.options, 'toggleVideo').name('Play/Pause')

  return gui
}
