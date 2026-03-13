declare module "react-native-animatable" {
  import { ComponentType } from "react";
    import { TextProps, ViewProps } from "react-native";

  export interface AnimatableViewProps extends ViewProps {
    animation?: string;
    duration?: number;
    delay?: number;
    direction?: string;
    easing?: string | ((t: number) => number);
    iterationCount?: number | "infinite";
    style?: any;
    useNativeDriver?: boolean;
    onAnimationBegin?: () => void;
    onAnimationEnd?: () => void;
  }

  export const View: ComponentType<AnimatableViewProps>;
  export const Text: ComponentType<AnimatableViewProps & TextProps>;
  export * from "react-native-animatable";
  const Animatable: any;
  export default Animatable;
}
