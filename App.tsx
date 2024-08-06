import { 
  Canvas, 
  Circle, 
  LinearGradient, 
  RoundedRect, 
  Rect, 
  matchFont,
  Shader, 
  Text, 
  useClock,
  vec,
  FontWeight, 
} from "@shopify/react-native-skia";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BrickInterface, CircleInterface, PaddleInterface } from "./types";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { BALL_COLOR, 
  BRICK_MIDDLE, 
  BRICK_ROW_LENGTH, 
  BRICK_WIDTH, 
  BRICK_HEIGHT, 
  PADDLE_HEIGHT, 
  PADDLE_MIDDLE, 
  PADDLE_WIDTH, 
  RADIUS, 
  TOTAL_BRICKS, 
  height, 
  width 
} from "./constants";
import { createBouncingExample , animate} from "./logic";
import { useFrameCallback } from "react-native-reanimated";
import { GestureDetector, GestureHandlerRootView, Gesture } from "react-native-gesture-handler";
import {shader} from "./shader";
interface Props {
  idx: number;
  brick: BrickInterface;
}

const fontFamily = Platform.select({ios: "Helvetica", default: "serif"});
const fontStyle = {
  fontFamily,
  fontSize: 55,
  FontWeight: "bold",
};

// @ts-ignore
const font = matchFont(fontStyle );

const resolution = vec(width, height);

const Brick =({ idx, brick }: Props) => {
  const color = useDerivedValue(() => {
    "worklet";
    return brick.canCollide.value ? "orange" : "transparent";
  }, [brick.canCollide ]);

  return (
    <RoundedRect
      key={idx }
      x={brick.x}
      y={brick.y }
      width={brick.width}
      height={brick.height}
      color={color}
      r={8}
      >
        <LinearGradient
          start={vec(5,300)}
          end={vec(4, 50)}
          colors={["red", "orange"]}
        />
    </RoundedRect>
  )
};


export default function App() {
  //console.log("in App()");
  const brickCount = useSharedValue(0);
  const clock = useClock();
  const circleObject: CircleInterface = {
    type: "Circle",
    id: 0,
    x: useSharedValue(0),
    y: useSharedValue(0),
    r: RADIUS,
    ax: 0,
    ay: 0,
    vx: 0,
    vy: 0,
    m: 1,
  };


  //console.log("initializing PaddleInterface");
  const rectangleObject: PaddleInterface = {
    type: "Paddle",
    id: 0,
    x: useSharedValue(PADDLE_MIDDLE),
    y: useSharedValue(height - 100),
    ax: 0,
    ay: 0,
    vx: 0,
    vy: 0,
    height: PADDLE_HEIGHT,
    width: PADDLE_WIDTH,
    m: 1,
  };

  const bricks: BrickInterface[] = Array(TOTAL_BRICKS)
    .fill(0)
    .map((_, idx) => {
      const farBrickX = BRICK_MIDDLE + BRICK_WIDTH + 50;
      const middleBrickX = BRICK_MIDDLE;
      const closeBrick = BRICK_MIDDLE - BRICK_WIDTH - 50;
      const startingY = 60;
      const ySpacing = 45;

      let startingXPosition = -1;

      if (idx % BRICK_ROW_LENGTH === 0) {
        startingXPosition = farBrickX;
      } else if (idx % BRICK_ROW_LENGTH === 1) {
        startingXPosition = middleBrickX;
      } else if (idx % BRICK_ROW_LENGTH === 2){
        startingXPosition = closeBrick;
      }

      const startingYPosition = 
        startingY + ySpacing * (Math.floor(idx / BRICK_ROW_LENGTH))

      return{
        type: "Brick",
        id: 0,
        x: useSharedValue(startingXPosition),
        y: useSharedValue(startingYPosition),
        m: 0,
        ax: 0,
        ay: 0,
        vx: 0,
        vy: 0,
        height: BRICK_HEIGHT,
        width: BRICK_WIDTH,
        canCollide: useSharedValue(true),
      };

        
    });
  
  const resetGame = () => {
    "worklet";
    rectangleObject.x.value = PADDLE_MIDDLE;
    createBouncingExample(circleObject);
    for (const brick of bricks) {
      brick.canCollide.value = true;
    }
    brickCount.value = 0;
  };    

  //console.log("completed rectangleObject initialization");
  createBouncingExample(circleObject);
  //console.log("called createBouncingExample with ",circleObject );

  useFrameCallback(( frameInfo) => {
    "worklet";
    //console.log("in useFrameCallback() with frameInfo -0 = ", frameInfo.timeSincePreviousFrame);
    
    if (!frameInfo.timeSincePreviousFrame) {
      //console.log("in useFrameCallback() with frameInfo -1 = ", frameInfo.timeSincePreviousFrame);
      return;
    }
    //console.log ("!frameInfo.timeSincePreviusFrame = -2 ", !frameInfo.timeSincePreviousFrame);
    if (brickCount.value === TOTAL_BRICKS || brickCount.value === -1) {
      circleObject.ax = 0.5;
      circleObject.ay = 1;
      circleObject.vx = 0;
      circleObject.vy = 0;
      return;
    }
    //console.log("calling animate for the circleObject, rectangle object and the bricks array");
    animate([circleObject, rectangleObject, ...bricks], 
      frameInfo.timeSincePreviousFrame,
      brickCount
    );
    //console.log("completed animate");
    
  }); 

  const gesture = Gesture.Pan()
    .onBegin(() => {
      if (brickCount.value === TOTAL_BRICKS || brickCount.value === -1) {
        resetGame();
      }
    })
    .onChange(({ x }) => {
      rectangleObject.x.value = x - PADDLE_WIDTH / 2;
    });

  const opacity = useDerivedValue(() => {
    return brickCount.value === TOTAL_BRICKS || brickCount.value === -1 ? 1 : 0;
  }, [brickCount]);

  const textPosition = useDerivedValue(() => {
    const endText = brickCount.value === TOTAL_BRICKS ? "HOORAY YOU WIN" : "BOO YOU LOSE";
    return (width - font.measureText(endText).width) / 2;
  }, [font]);

  const gameEndingText = useDerivedValue(() => {
    return brickCount.value === TOTAL_BRICKS ? "HOORAY YOU WIN" : "BOO YOU LOSE";
  }, []);

  const uniforms = useDerivedValue(() => {
    "worklet";
    return {
      iResolution: vec(width, height),
      iTime: clock.value * 0.0005,
    };
  }, [width, height, clock])

  
  return (
    <GestureHandlerRootView style={{ flex:1 }}>
      <GestureDetector gesture={gesture}>
        <View style={styles.container}>
          <Canvas style={{ flex: 1 }}>
            <Rect x={0} height={height} width={width}>
              <Shader source={shader} uniforms={uniforms} />
            </Rect>

            <Circle 
              cx={circleObject.x}
              cy={circleObject.y}
              r={RADIUS}
              color={BALL_COLOR}
            />
            <RoundedRect
              x={rectangleObject.x}
              y={rectangleObject.y}
              width={rectangleObject.width}
              height={rectangleObject.height}
              color={"white"}
              r= {8}

            />
            {bricks.map((brick, idx) => {
              return <Brick key={idx} idx={idx} brick={brick} />;
            })}
            <Rect
              x={0}
              y={0}
              height={height}
              width={width}
              color={"red"}
              opacity={opacity}
            >
              <LinearGradient
                start={vec(0, 200)}
                end={vec(0, 500)}
                colors={["#4070D3", "#EA2F86"]}
              />
            </Rect>
            <Text
              x={textPosition}
              y={height / 2}
              text={gameEndingText}
              font={font}
              opacity={opacity}
            />

          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  titleContainer: {
    flexDirection: "row",
  },
  titleTextNormal: {
    color: "white",
    fontSize: 40,
  },
  titleTextBold: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
  },
});
