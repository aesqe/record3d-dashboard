import { Controller, GUI } from 'lil-gui'

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

type AddGuiOptions = {
  name: string
  property: string
  min?: number
  choices?: string[]
  isColor?: boolean
  max?: number
  step?: number
  folderName?: string
  onChange?: (value?: any) => void
}

export const addGuiOption = (
  gui: GUI,
  options: Record<string, any>,
  {
    name,
    property,
    min,
    max,
    step,
    choices,
    isColor = false,
    folderName,
    onChange
  }: AddGuiOptions
) => {
  let guiFolder: GUI | null = null

  if (folderName) {
    guiFolder =
      gui?.folders?.find(f => f._title === folderName) ||
      gui.addFolder(folderName)
  }

  const g = guiFolder || gui

  let controller: Controller | null = null

  if (isColor) {
    controller = g.addColor(options, property)
  } else if (choices) {
    controller = g.add(options, property, choices)
  } else if (typeof min !== 'undefined') {
    controller = g.add(options, property, min, max, step)
  } else {
    controller = g.add(options, property)
  }

  if (onChange) {
    controller.onChange(onChange)
  }

  return controller.name(name)
}

export const guiHelper = (scene: Record3DScene) => {
  const gui = new GUI({ title: '' })

  const findCameraPosition = (positionName: string) =>
    scene.cameraPresetPositions.find(
      position => position.name === positionName
    ) || scene.cameraPresetPositions[0]

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Rendering',
    name: 'Scale',
    property: 'modelScale',
    min: 0.1,
    max: 20,
    step: 0.1,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setScale(scene.guiOptions.modelScale)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Rendering',
    name: 'Point Size',
    property: 'modelPointSize',
    min: 0.1,
    max: 20,
    step: 0.1,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setPointSize(scene.guiOptions.modelPointSize)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Rendering',
    name: 'Render each nth point only',
    property: 'renderNthPoint',
    min: 1,
    max: 1000,
    step: 1,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setRenderNthPoint(scene.guiOptions.renderNthPoint)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Rendering',
    name: 'Half Resolution',
    property: 'halfResolution',
    onChange: (value: boolean) => {
      scene.halfResolution = value
      scene.onWindowResize(true)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Rendering',
    name: 'Rendering mode',
    property: 'renderingMode',
    choices: ['points', 'mesh', 'mesh-wireframe', 'spheres'],
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.renderingMode = scene.guiOptions.renderingMode
        ptCloud.onVideoTagChanged()
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Colors',
    name: 'Opacity',
    property: 'opacity',
    min: 0.1,
    max: 1,
    step: 0.1,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setOpacity(scene.guiOptions.opacity)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Colors',
    name: 'Saturation',
    property: 'saturation',
    min: 0.0,
    max: 1,
    step: 0.01,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setSaturation(scene.guiOptions.saturation * 3.0)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Colors',
    name: 'Color',
    property: 'singleColorVec',
    isColor: true,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setSingleColor(scene.guiOptions.singleColorVec)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Colors',
    name: 'Use single color',
    property: 'useSingleColor',
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setUseSingleColor(scene.guiOptions.useSingleColor)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Colors',
    name: 'Canvas color',
    property: 'backgroundColor',
    isColor: true,
    onChange: () => {
      scene.scene.background = scene.guiOptions.backgroundColor
      scene.renderer.setClearColor(scene.guiOptions.backgroundColor)
      scene.renderer.domElement.style.backgroundColor =
        scene.guiOptions.backgroundColor
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Colors',
    name: 'Transparent background',
    property: 'transparentBackground',
    onChange: () => {
      scene.renderer.domElement.style.backgroundColor = 'transparent'
      scene.renderer.setClearColor(0x000000, 0)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Depth',
    name: 'Depth threshold',
    property: 'depthThresholdFilter',
    min: 0.001,
    max: 1.5,
    step: 0.001,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setDepthThresholdFilter(scene.guiOptions.depthThresholdFilter)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Depth',
    name: 'Depth range X',
    property: 'absoluteDepthRangeFilterX',
    min: 0.005,
    max: 5.0,
    step: 0.005,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setAbsoluteDepthRangeFilterX(
          scene.guiOptions.absoluteDepthRangeFilterX
        )
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Depth',
    name: 'Depth range Y',
    property: 'absoluteDepthRangeFilterY',
    min: 0.005,
    max: 5.0,
    step: 0.005,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.setAbsoluteDepthRangeFilterY(
          scene.guiOptions.absoluteDepthRangeFilterY
        )
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Noise',
    name: 'Use displacement noise',
    property: 'useNoise',
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.useNoise(scene.guiOptions.useNoise)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Noise',
    name: 'Noise strength',
    property: 'noiseStrength',
    min: 0.0,
    max: 2.0,
    step: 0.01,
    onChange: () => {
      for (let ptCloud of scene.pointClouds) {
        ptCloud.noiseStrength(scene.guiOptions.noiseStrength)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Noise',
    name: 'Random noise multiplier',
    property: 'randomizeSeed',
    onChange: (value: boolean) => {
      scene.randomizeSeed = value
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Presets',
    name: 'Load Preset',
    property: 'presetName',
    choices: getGuiPresetsList(),
    onChange: () => {
      const presetName = scene.guiOptions.presetName
      const preset = getGuiPreset(presetName)

      if (preset) {
        gui.load(preset)

        loadCameraPosition(scene, preset.view)
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Presets',
    name: 'Save Preset',
    property: 'savePreset'
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Presets',
    name: 'Export Presets',
    property: 'exportPresets'
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Presets',
    name: 'Import Presets',
    property: 'importPresets'
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Misc.',
    name: 'Mute/Unmute',
    property: 'toggleSound',
    onChange: () => {
      for (let video of scene.pointClouds) {
        video.toggleSound()
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Controls',
    name: 'Controls type',
    property: 'controlsType',
    choices: ['arcball', 'orbit', 'both'],
    onChange: (value: string) => {
      if (value === 'both') {
        scene.controls.enabled = false
        scene.arcBallControls.enabled = true
      } else if (value === 'arcball') {
        scene.controls.enabled = false
        scene.arcBallControls.enabled = true
      } else if (value === 'orbit') {
        scene.controls.enabled = true
        scene.arcBallControls.enabled = false
      }
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Controls',
    name: 'Show ArcBall Gizmo',
    property: 'showArcBallGizmo',
    onChange: (value: boolean) => {
      scene.arcBallControls.setGizmosVisible(value)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Controls',
    name: 'Toggle bounding box',
    property: 'toggleBoundingBox'
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Misc.',
    name: 'Reset Options',
    property: 'resetOptions'
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Camera positions',
    name: 'Front',
    property: 'cameraPosition',
    onChange: () => {
      scene.setCameraPosition(findCameraPosition('front').position)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Camera positions',
    name: 'Back',
    property: 'cameraPosition',
    onChange: () => {
      scene.setCameraPosition(findCameraPosition('back').position)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Camera positions',
    name: 'Left',
    property: 'cameraPosition',
    onChange: () => {
      scene.setCameraPosition(findCameraPosition('left').position)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Camera positions',
    name: 'Right',
    property: 'cameraPosition',
    onChange: () => {
      scene.setCameraPosition(findCameraPosition('right').position)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Camera positions',
    name: 'Top',
    property: 'cameraPosition',
    onChange: () => {
      scene.setCameraPosition(findCameraPosition('top').position)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Camera positions',
    name: 'Bottom',
    property: 'cameraPosition',
    onChange: () => {
      scene.setCameraPosition(findCameraPosition('bottom').position)
    }
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Videos',
    name: 'Import local video',
    property: 'importLocalVideo'
  })

  addGuiOption(gui, scene.guiOptions, {
    folderName: 'Videos',
    name: 'Use streaming video',
    property: 'useStreamingVideo'
  })

  return gui
}
