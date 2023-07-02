import { GUI } from 'lil-gui'

import { Record3DScene } from './Record3DScene'
import { loadCameraPosition } from './utils'

export type LilGuiPreset = {
  controllers: Record<string, any>
  folders: Record<string, any>
  name: string
  view: Record<string, any>
}

export let guiPresets: LilGuiPreset[] = []

export const getGuiPresetsList = () => {
  const presets = guiPresets.map(preset => preset.name)
  presets.unshift('None')

  return presets
}

export const getGuiPresets = (): LilGuiPreset[] => {
  return JSON.parse(localStorage.getItem('bb-gui-presets') || '[]')
}

export const getGuiPreset = (presetName: string) => {
  return getGuiPresets().find(preset => preset.name === presetName)
}

export const setGuiPresets = () =>
  localStorage.setItem('bb-gui-presets', JSON.stringify(guiPresets))

export const addGuiPreset = (preset: LilGuiPreset) =>
  guiPresets.push(preset) && setGuiPresets()

guiPresets = getGuiPresets()

export const guiHelper = (scene: Record3DScene) => {
  const gui = new GUI()

  const rendering = gui.addFolder('Rendering')

  rendering
    .add(scene.options, 'modelScale')
    .name('Scale')
    .min(0.1)
    .max(20)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setScale(scene.options.modelScale)
      }
    })

  rendering
    .add(scene.options, 'modelPointSize')
    .name('Point Size')
    .min(0.1)
    .max(20)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setPointSize(scene.options.modelPointSize)
      }
    })

  rendering
    .add(scene.options, 'renderNthPoint')
    .name('Render each nth point only')
    .min(1)
    .max(1000)
    .step(1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setRenderNthPoint(scene.options.renderNthPoint)
      }
    })

  rendering
    .add(scene.options, 'halfResolution')
    .name('Half Resolution')
    .onChange((value: boolean) => {
      scene.halfResolution = value
      scene.onWindowResize(true)
    })

  rendering
    .add(scene.options, 'renderingMode', [
      'points',
      'mesh',
      'mesh-wireframe',
      'spheres'
    ])
    .name('Rendering mode')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.renderingMode = scene.options.renderingMode
        ptCloud.onVideoTagChanged()
      }
    })

  const color = gui.addFolder('Colors')

  color
    .add(scene.options, 'opacity')
    .name('Opacity')
    .min(0.1)
    .max(1.0)
    .step(0.1)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setOpacity(scene.options.opacity)
      }
    })

  color
    .add(scene.options, 'saturation')
    .name('Saturation')
    .min(0.0)
    .max(1.0)
    .step(0.01)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setSaturation(scene.options.saturation * 3.0)
      }
    })

  color
    .addColor(scene.options, 'singleColorVec')
    .name('Color')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setSingleColor(scene.options.singleColorVec)
      }
    })

  color
    .add(scene.options, 'useSingleColor')
    .name('Use single color')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setUseSingleColor(scene.options.useSingleColor)
      }
    })

  color
    .addColor(scene.options, 'backgroundColor')
    .name('Canvas color')
    .onChange(() => {
      scene.scene.background = scene.options.backgroundColor
      scene.renderer.setClearColor(scene.options.backgroundColor)
      scene.renderer.domElement.style.backgroundColor =
        scene.options.backgroundColor
    })

  color
    .add(scene.options, 'transparentBackground')
    .name('Transparent background')

  const depth = gui.addFolder('Depth')

  depth
    .add(scene.options, 'depthThresholdFilter')
    .name('Depth threshold')
    .min(0.001)
    .max(1.5)
    .step(0.001)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setDepthThresholdFilter(scene.options.depthThresholdFilter)
      }
    })

  depth
    .add(scene.options, 'absoluteDepthRangeFilterX')
    .name('Depth range X')
    .min(0.005)
    .max(5.0)
    .step(0.005)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setAbsoluteDepthRangeFilterX(
          scene.options.absoluteDepthRangeFilterX
        )
      }
    })

  depth
    .add(scene.options, 'absoluteDepthRangeFilterY')
    .name('Depth range Y')
    .min(0.005)
    .max(5.0)
    .step(0.005)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setAbsoluteDepthRangeFilterY(
          scene.options.absoluteDepthRangeFilterX
        )
      }
    })

  const noise = gui.addFolder('Noise')
  noise
    .add(scene.options, 'useNoise')
    .name('Use displacement noise')
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.useNoise(scene.options.useNoise)
      }
    })

  noise
    .add(scene.options, 'noiseStrength')
    .name('Noise strength')
    .min(0.0)
    .max(2.0)
    .step(0.01)
    .onChange(() => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.noiseStrength(scene.options.noiseStrength)
      }
    })

  noise
    .add(scene.options, 'randomizeSeed')
    .name('Random noise multiplier')
    .onChange((value: boolean) => {
      scene.randomizeSeed = value
    })

  const presets = gui.addFolder('Presets')

  const presetNameController = presets.add(
    scene.options,
    'presetName',
    getGuiPresetsList()
  )

  presetNameController.name('Load Preset').onChange(() => {
    const presetName = scene.options.presetName
    const preset = getGuiPreset(presetName)

    if (preset) {
      gui.load(preset)

      loadCameraPosition(scene, preset.view)
    }
  })

  presets.add(scene.options, 'savePreset').name('Save Preset')
  presets.add(scene.options, 'exportPresets').name('Export Presets')
  presets.add(scene.options, 'importPresets').name('Import Presets')

  const misc = gui.addFolder('Misc.')

  misc.add(scene.options, 'toggleSound').name('Mute/Unmute')
  misc.add(scene.options, 'resetOptions').name('Reset Options')

  return gui
}
