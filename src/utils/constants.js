import { fabric } from 'fabric';
import * as material from 'material-colors';

// JSON 序列化时保留的关键字段
export const JSON_KEYS = [
  'name',
  'gradientAngle',
  'selectable',
  'hasControls',
  'linkData',
  'editable',
  'extensionType',
  'extension',
];

// 图像滤镜列表
export const filters = [
  'none',
  'polaroid',
  'sepia',
  'kodachrome',
  'contrast',
  'brightness',
  'greyscale',
  'brownie',
  'vintage',
  'technicolor',
  'pixelate',
  'invert',
  'blur',
  'sharpen',
  'emboss',
  'removecolor',
  'blacknwhite',
  'vibrance',
  'blendcolor',
  'huerotate',
  'resize',
  'saturation',
  'gamma',
];

// 可用字体列表
export const fonts = [
  'Arial',
  'Arial Black',
  'Verdana',
  'Helvetica',
  'Tahoma',
  'Trebuchet MS',
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Courier New',
  'Brush Script MT',
  'Palatino',
  'Bookman',
  'Comic Sans MS',
  'Impact',
  'Lucida Sans Unicode',
  'Geneva',
  'Lucida Console',
  '微软雅黑',
  'Microsoft YaHei',
  '黑体',
  'SimHei',
  '宋体',
  'SimSun',
  '仿宋',
  'FangSong',
  '楷体',
  'KaiTi',
  '隶书',
  'LiSu',
  '幼圆',
  'YouYuan',
  '华文黑体',
  'STHeiti',
  '华文楷体',
  'STKaiti',
  '华文宋体',
  'STSong',
  '华文仿宋',
  'STFangsong',
  '华文琥珀',
  'STHupo',
  '华文彩云',
  'STCaiyun',
  '华文隶书',
  'STLiti',
  '华文行楷',
  'STXingkai',
  '华文新魏',
  'STXinwei',
  '苹方',
  'PingFang SC',
  '苹方-简',
  'PingFang SC Light',
  '苹方-中黑',
  'PingFang SC Medium',
  '苹方-细体',
  'PingFang SC Thin',
  '思源黑体',
  'Source Han Sans SC',
  '思源宋体',
  'Source Han Serif SC',
  'Noto Sans CJK SC',
  'Noto Serif CJK SC',
];

// 依赖选中对象的工具
export const selectionDependentTools = [
  'fill',
  'font',
  'filter',
  'opacity',
  'remove-bg',
  'stroke-color',
  'stroke-width',
];

// 默认颜色集（取自 material-colors）
export const colors = [
  material.red['500'],
  material.pink['500'],
  material.purple['500'],
  material.deepPurple['500'],
  material.indigo['500'],
  material.blue['500'],
  material.lightBlue['500'],
  material.cyan['500'],
  material.teal['500'],
  material.green['500'],
  material.lightGreen['500'],
  material.lime['500'],
  material.yellow['500'],
  material.amber['500'],
  material.orange['500'],
  material.deepOrange['500'],
  material.brown['500'],
  material.blueGrey['500'],
  'transparent',
];

// 默认绘图参数
export const FILL_COLOR = 'rgba(0,0,0,1)';
export const STROKE_COLOR = 'rgba(0,0,0,1)';
export const STROKE_WIDTH = 2;
export const STROKE_DASH_ARRAY = [];
export const FONT_FAMILY = 'Arial';
export const FONT_SIZE = 32;
export const FONT_WEIGHT = 400;

// 形状默认参数
export const CIRCLE_OPTIONS = {
  radius: 225,
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
};

export const RECTANGLE_OPTIONS = {
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
  width: 400,
  height: 400,
  angle: 0,
};

export const DIAMOND_OPTIONS = {
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
  width: 600,
  height: 600,
  angle: 0,
};

export const TRIANGLE_OPTIONS = {
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  stroke: STROKE_COLOR,
  strokeWidth: STROKE_WIDTH,
  width: 400,
  height: 400,
  angle: 0,
};

export const TEXT_OPTIONS = {
  type: 'textbox',
  left: 100,
  top: 100,
  fill: FILL_COLOR,
  fontSize: FONT_SIZE,
  fontFamily: FONT_FAMILY,
};
