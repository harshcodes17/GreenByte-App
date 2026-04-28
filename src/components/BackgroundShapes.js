import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const Blob = ({ color, size, duration, delay }) => {
  const moveX = useRef(new Animated.Value(Math.random() * width)).current;
  const moveY = useRef(new Animated.Value(Math.random() * height)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.timing(moveX, {
          toValue: Math.random() * width,
          duration: duration,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(moveY, {
          toValue: Math.random() * height,
          duration: duration,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [
            { translateX: moveX },
            { translateY: moveY },
            { scale: scale },
          ],
        },
      ]}
    />
  );
};

export const BackgroundShapes = ({ isDarkMode }) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Blob color={isDarkMode ? "rgba(32, 201, 151, 0.05)" : "rgba(11, 107, 75, 0.1)"} size={300} duration={25000} delay={0} />
      <Blob color={isDarkMode ? "rgba(249, 214, 128, 0.04)" : "rgba(249, 168, 38, 0.08)"} size={250} duration={30000} delay={1000} />
      <Blob color={isDarkMode ? "rgba(167, 196, 186, 0.05)" : "rgba(106, 131, 123, 0.1)"} size={350} duration={35000} delay={2000} />
      <Blob color={isDarkMode ? "rgba(32, 201, 151, 0.03)" : "rgba(11, 107, 75, 0.05)"} size={200} duration={20000} delay={500} />
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    opacity: 0.6,
  },
});
