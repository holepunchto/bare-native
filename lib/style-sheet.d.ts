/** A set of styles validated once and frozen, so that they can be passed around by reference. */
declare class NativeStyleSheet {
  /**
   * Validate `styles` and freeze each of them, and the set itself, in place. Throws on a property
   * that no node accepts.
   */
  static create<T extends Record<string, NativeStyleSheet.Style>>(
    styles: T
  ): { readonly [K in keyof T]: Readonly<T[K]> }

  /** Merge a style, or a nested list of them, into a new object. Later entries win. */
  static flatten(value: NativeStyleSheet.StyleProp): NativeStyleSheet.Style
}

declare namespace NativeStyleSheet {
  export type EnvName =
    | 'safe-area-inset-top'
    | 'safe-area-inset-right'
    | 'safe-area-inset-bottom'
    | 'safe-area-inset-left'
    | 'keyboard-inset-height'

  /** A value that follows a variable of the environment of the root, such as `env(safe-area-inset-top)`. */
  export type Env = `env(${EnvName})`

  /** A length in points, or dp on Android. There are no percentages and no `auto`. */
  export type Length = number | Env

  /**
   * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)`, `rgba(r, g, b, a)`, or the components
   * between 0 and 1. There are no named colors.
   */
  export type Color = string | { red: number; green: number; blue: number; alpha: number }

  export type Angle = `${number}deg` | `${number}rad`

  /** Transforms are applied in CSS order, the last one first. */
  export type Transform =
    | { perspective: number }
    | { rotate: Angle }
    | { rotateX: Angle }
    | { rotateY: Angle }
    | { rotateZ: Angle }
    | { scale: number }
    | { scaleX: number }
    | { scaleY: number }
    | { translateX: number }
    | { translateY: number }

  type Align =
    | 'auto'
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'stretch'
    | 'baseline'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'

  /** Accepted on every node. A property that is left out or `undefined` goes back to its default. */
  export interface LayoutStyle {
    direction?: 'inherit' | 'ltr' | 'rtl'
    flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
    justifyContent?:
      | 'flex-start'
      | 'center'
      | 'flex-end'
      | 'space-between'
      | 'space-around'
      | 'space-evenly'
    alignContent?: Align
    alignItems?: Align
    alignSelf?: Align
    position?: 'static' | 'relative' | 'absolute'
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
    display?: 'flex' | 'none'

    flex?: Length
    flexGrow?: Length
    flexShrink?: Length
    flexBasis?: Length
    aspectRatio?: Length

    width?: Length
    height?: Length
    minWidth?: Length
    minHeight?: Length
    maxWidth?: Length
    maxHeight?: Length

    gap?: Length
    rowGap?: Length
    columnGap?: Length

    top?: Length
    right?: Length
    bottom?: Length
    left?: Length
    start?: Length
    end?: Length

    margin?: Length
    marginTop?: Length
    marginRight?: Length
    marginBottom?: Length
    marginLeft?: Length
    marginStart?: Length
    marginEnd?: Length
    marginHorizontal?: Length
    marginVertical?: Length

    padding?: Length
    paddingTop?: Length
    paddingRight?: Length
    paddingBottom?: Length
    paddingLeft?: Length
    paddingStart?: Length
    paddingEnd?: Length
    paddingHorizontal?: Length
    paddingVertical?: Length

    /** Only the uniform `borderWidth` is drawn. The edges only inset the children. */
    borderWidth?: Length
    borderTopWidth?: Length
    borderRightWidth?: Length
    borderBottomWidth?: Length
    borderLeftWidth?: Length
    borderStartWidth?: Length
    borderEndWidth?: Length
    borderHorizontalWidth?: Length
    borderVerticalWidth?: Length
  }

  export interface PaintStyle {
    backgroundColor?: Color
    borderColor?: Color
    borderRadius?: number | Env
    /** A corner wins over `borderRadius`. */
    borderTopLeftRadius?: number | Env
    borderTopRightRadius?: number | Env
    borderBottomRightRadius?: number | Env
    borderBottomLeftRadius?: number | Env
    borderStyle?: 'solid' | 'dotted' | 'dashed'
    cursor?:
      | 'auto'
      | 'default'
      | 'pointer'
      | 'text'
      | 'crosshair'
      | 'not-allowed'
      | 'ew-resize'
      | 'ns-resize'
    opacity?: number | Env
    overflow?: 'visible' | 'hidden' | 'scroll'
    pointerEvents?: 'auto' | 'none'
    shadowColor?: Color
    shadowOffset?: { width: number; height: number }
    shadowOpacity?: number | Env
    shadowRadius?: number | Env
    transform?: Transform[]
    /** Up to two keywords, points or percentages, such as `'left top'` or `['50%', 10]`. */
    transformOrigin?: string | (number | string)[]
    zIndex?: number | Env
  }

  /** What a run of text accepts, and the only properties a `TextFragment` accepts. */
  export interface TextRunStyle {
    color?: Color
    fontFamily?: string
    fontSize?: number | Env
    /** `normal` is 400 and `bold` is 700. Rounded to the nearest 100 between 100 and 900. */
    fontWeight?: number | `${number}` | 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic' | 'oblique'
    letterSpacing?: number | Env
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
  }

  export interface ViewStyle extends LayoutStyle, PaintStyle {}

  export interface TextStyle extends LayoutStyle, Omit<PaintStyle, 'pointerEvents'>, TextRunStyle {
    textAlign?: 'left' | 'center' | 'right' | 'justify' | 'natural'
    lineHeight?: number | Env
  }

  export interface TextInputStyle extends Omit<
    TextStyle,
    'textTransform' | 'lineHeight' | 'overflow' | 'pointerEvents'
  > {}

  export interface ImageStyle extends LayoutStyle, Omit<PaintStyle, 'overflow' | 'pointerEvents'> {
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center'
    tintColor?: Color
  }

  export interface ControlStyle
    extends LayoutStyle, Omit<PaintStyle, 'overflow' | 'pointerEvents'> {}

  export interface ActivityIndicatorStyle extends ControlStyle {
    color?: Color
  }

  /** Every property that some node accepts. */
  export interface Style extends ViewStyle, TextStyle, ImageStyle, ActivityIndicatorStyle {}

  /** A style, or a nested list of them to be merged in order. Falsy entries are skipped. */
  export type StyleProp<S = Style> = S | null | undefined | false | readonly StyleProp<S>[]
}

export = NativeStyleSheet
