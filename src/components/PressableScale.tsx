import React, { ReactNode, useRef } from "react";
import {
    Animated,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from "react-native";

type PressableScaleProps = Omit<PressableProps, "style" | "children"> & {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const PressableScale = ({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPressIn={(event) => {
        animateTo(scaleTo);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default PressableScale;
